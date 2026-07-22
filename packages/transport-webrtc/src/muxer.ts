import { AbstractStreamMuxer } from '@libp2p/utils'
import { MAX_EARLY_DATA_CHANNEL_BYTES, MAX_EARLY_DATA_CHANNEL_MESSAGES, MAX_EARLY_DATA_CHANNELS, MUXER_PROTOCOL } from './constants.ts'
import { createStream, WebRTCStream } from './stream.ts'
import type { DataChannelOptions } from './index.ts'
import type { ComponentLogger, CounterGroup, Logger, StreamMuxer, StreamMuxerFactory, CreateStreamOptions, MultiaddrConnection } from '@libp2p/interface'

export interface DataChannelMuxerFactoryInit {
  /**
   * WebRTC Peer Connection
   */
  peerConnection: RTCPeerConnection

  /**
   * The protocol to use
   */
  protocol?: string

  /**
   * Optional metrics for this data channel muxer
   */
  metrics?: CounterGroup

  /**
   * Optional logger, used to report early data channels that are dropped
   * because they breach the early buffer bounds
   */
  log?: Logger

  /**
   * Options used to create data channels
   */
  dataChannelOptions?: DataChannelOptions
}

export interface DataChannelMuxerFactoryComponents {
  logger: ComponentLogger
}

interface EarlyDataChannel {
  channel: RTCDataChannel

  /**
   * Messages that arrived before the muxer adopted the channel - without
   * buffering these they would be silently dropped as the stream's `message`
   * listener is only added when the muxer is created
   */
  messages: MessageEvent[]

  /**
   * Number of bytes currently buffered for this channel, used to enforce the
   * per-channel early buffer cap
   */
  bytes: number
}

/**
 * Close a data channel, tolerating a synchronous throw from the
 * node-datachannel polyfill when its cached `readyState` is stale (see the
 * same guard around `channel.send` in stream.ts). Closing is best-effort.
 */
function closeChannel (channel: RTCDataChannel, log?: Logger): void {
  try {
    channel.close()
  } catch (err) {
    log?.trace('error closing early data channel - %e', err)
  }
}

/**
 * Detach the buffering handler, release the buffered messages and close the
 * channel. Used both when disposing a single over-limit channel and when
 * discarding the whole early buffer.
 */
function disposeEarlyDataChannel (early: EarlyDataChannel, log?: Logger): void {
  early.channel.onmessage = null
  early.messages.length = 0
  closeChannel(early.channel, log)
}

export class DataChannelMuxerFactory implements StreamMuxerFactory {
  public readonly protocol: string

  /**
   * WebRTC Peer Connection
   */
  private readonly peerConnection: RTCPeerConnection
  private readonly metrics?: CounterGroup
  private readonly log?: Logger
  private readonly dataChannelOptions?: DataChannelOptions
  private readonly earlyDataChannels: EarlyDataChannel[]
  private handedOff = false

  constructor (init: DataChannelMuxerFactoryInit) {
    this.onEarlyDataChannel = this.onEarlyDataChannel.bind(this)

    this.peerConnection = init.peerConnection
    this.metrics = init.metrics
    this.log = init.log
    this.protocol = init.protocol ?? MUXER_PROTOCOL
    this.dataChannelOptions = init.dataChannelOptions ?? {}
    this.peerConnection.addEventListener('datachannel', this.onEarlyDataChannel)
    this.earlyDataChannels = []
  }

  private onEarlyDataChannel (evt: RTCDataChannelEvent): void {
    const channel = evt.channel

    // reject channels opened before the muxer exists beyond the count cap
    // rather than buffer them - closes the excess channel without aborting the
    // connection (a well-behaved remote does not open this many streams before
    // the connection upgrade completes)
    if (this.earlyDataChannels.length >= MAX_EARLY_DATA_CHANNELS) {
      this.log?.('rejecting early data channel %d - too many early channels', channel.id)
      this.metrics?.increment({ early_data_channel_count_exceeded: true })
      channel.onmessage = null
      closeChannel(channel, this.log)
      return
    }

    // ensure incoming messages arrive as ArrayBuffers so their size can be
    // measured and so replayed messages match what the stream expects (see
    // stream.ts)
    channel.binaryType = 'arraybuffer'

    const early: EarlyDataChannel = {
      channel,
      messages: [],
      bytes: 0
    }

    // buffer incoming messages until the muxer adopts the channel, otherwise
    // any data sent by the remote before the connection upgrade completes is
    // silently dropped. The buffer is bounded so a remote cannot make us hold
    // unbounded data before the connection has even been admitted.
    //
    // NOTE: this must stay on the `onmessage` property rather than
    // `addEventListener` - adoption relies on `createStream` overwriting
    // `onmessage` (see stream.ts) to detach this buffer
    channel.onmessage = (messageEvent) => {
      const { data } = messageEvent

      // only binary frames are valid early stream data - a text frame (or any
      // non-ArrayBuffer payload) has no measurable size and is not something a
      // stream could consume, so treat it as a misbehaving remote
      if (!(data instanceof ArrayBuffer)) {
        this.closeEarlyDataChannel(early, 'invalid_message')
        return
      }

      // bound the message count as well as the byte total, otherwise a flood of
      // tiny or empty messages evades the byte cap by contributing ~0 bytes each
      if (early.messages.length >= MAX_EARLY_DATA_CHANNEL_MESSAGES) {
        this.closeEarlyDataChannel(early, 'message_count_exceeded')
        return
      }

      if (early.bytes + data.byteLength > MAX_EARLY_DATA_CHANNEL_BYTES) {
        this.closeEarlyDataChannel(early, 'byte_count_exceeded')
        return
      }

      early.bytes += data.byteLength
      early.messages.push(messageEvent)
    }

    this.earlyDataChannels.push(early)
  }

  private closeEarlyDataChannel (early: EarlyDataChannel, reason: string): void {
    this.log?.('closing early data channel %d - %s', early.channel.id, reason)
    this.metrics?.increment({ [`early_data_channel_${reason}`]: true })

    disposeEarlyDataChannel(early, this.log)

    const index = this.earlyDataChannels.indexOf(early)
    if (index !== -1) {
      this.earlyDataChannels.splice(index, 1)
    }
  }

  createStreamMuxer (maConn: MultiaddrConnection): StreamMuxer {
    // ownership of the buffered early channels transfers to the muxer, so a
    // later `close()` from the transport must not dispose them
    this.handedOff = true
    this.peerConnection.removeEventListener('datachannel', this.onEarlyDataChannel)

    return new DataChannelMuxer(maConn, {
      peerConnection: this.peerConnection,
      dataChannelOptions: this.dataChannelOptions,
      metrics: this.metrics,
      protocol: this.protocol,
      earlyDataChannels: this.earlyDataChannels
    })
  }

  /**
   * Discards any early data channels buffered before the muxer was created and
   * detaches the `datachannel` listener. Called by the transport whenever the
   * upgrade fails; it is a no-op once `createStreamMuxer` has handed the
   * channels to the muxer, and otherwise ensures a peer whose connection is
   * rejected cannot leave buffered data or listeners behind.
   */
  close (): void {
    if (this.handedOff) {
      return
    }

    this.peerConnection.removeEventListener('datachannel', this.onEarlyDataChannel)

    for (const early of this.earlyDataChannels) {
      disposeEarlyDataChannel(early, this.log)
    }

    this.earlyDataChannels.length = 0
  }
}

export interface DataChannelMuxerInit extends DataChannelMuxerFactoryInit {
  protocol: string

  /**
   * Incoming data channels that were opened by the remote before the peer
   * connection was established, along with any messages that arrived before
   * the muxer was created
   */
  earlyDataChannels: EarlyDataChannel[]
}

export interface DataChannelMuxerComponents {
  logger: ComponentLogger
}

/**
 * A libp2p data channel stream muxer
 */
export class DataChannelMuxer extends AbstractStreamMuxer<WebRTCStream> implements StreamMuxer<WebRTCStream> {
  private readonly peerConnection: RTCPeerConnection
  private readonly dataChannelOptions: DataChannelOptions

  constructor (maConn: MultiaddrConnection, init: DataChannelMuxerInit) {
    super(maConn, {
      ...init,
      name: 'muxer'
    })

    this.peerConnection = init.peerConnection
    this.protocol = init.protocol ?? MUXER_PROTOCOL
    this.dataChannelOptions = init.dataChannelOptions ?? {}

    /**
     * Fired when a data channel has been added to the connection has been
     * added by the remote peer.
     *
     * {@link https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/datachannel_event}
     */
    this.peerConnection.ondatachannel = ({ channel }) => {
      this.onDataChannel(channel)
    }

    queueMicrotask(() => {
      if (this.status !== 'open') {
        // the connection was torn down before we could adopt these channels -
        // detach the buffer, release it, and close the channel
        init.earlyDataChannels.forEach((early) => {
          disposeEarlyDataChannel(early, this.log)
        })
        return
      }

      init.earlyDataChannels.forEach(({ channel, messages }) => {
        this.onDataChannel(channel, messages)
      })
    })
  }

  private onDataChannel (channel: RTCDataChannel, earlyMessages?: MessageEvent[]): void {
    this.log('incoming datachannel with channel id %d, protocol %s and status %s', channel.id, channel.protocol, channel.readyState)

    // 'init' channel is only used during connection establishment, it is
    // closed by the initiator
    if (channel.label === 'init') {
      this.log.trace('closing init channel %d', channel.id)
      channel.close()

      return
    }

    const stream = createStream({
      ...this.streamOptions,
      ...this.dataChannelOptions,
      channel,
      direction: 'inbound',
      log: this.log
    })

    // replay any messages that arrived before the muxer was created - the
    // stream has just attached its `message` handler so this preserves
    // ordering with any messages that arrive later
    earlyMessages?.forEach(messageEvent => {
      channel.onmessage?.(messageEvent)
    })

    this.onRemoteStream(stream)
  }

  async onCreateStream (options?: CreateStreamOptions): Promise<WebRTCStream> {
    // The spec says the label MUST be an empty string: https://github.com/libp2p/specs/blob/master/webrtc/README.md#rtcdatachannel-label
    const channel = this.peerConnection.createDataChannel('', {
      // TODO: pre-negotiate stream protocol
      // protocol: options?.protocol
    })

    this.log('open channel %d for protocol %s', channel.id, options?.protocol)

    const stream = createStream({
      ...options,
      ...this.dataChannelOptions,
      channel,
      direction: 'outbound',
      log: this.log
    })

    return stream
  }

  onData (): void {

  }
}
