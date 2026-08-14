import { AbstractStreamMuxer } from '@libp2p/utils'
import { DEFAULT_MAX_EARLY_STREAMS, MAX_EARLY_DATA_CHANNEL_BYTES, MAX_EARLY_DATA_CHANNEL_MESSAGES, MUXER_PROTOCOL } from './constants.ts'
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
   * Optional logger, used to report early data channels that are dropped or
   * rejected, and best-effort close errors
   */
  log?: Logger

  /**
   * Caps the early data channel buffer and the muxer's early streams from one
   * value (see `DEFAULT_MAX_EARLY_STREAMS`)
   */
  maxEarlyStreams?: number

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
   * Messages buffered before the muxer adopted the channel; without these they
   * would be dropped, since the stream's `message` listener is only attached
   * when the muxer is created
   */
  messages: Array<MessageEvent<ArrayBuffer>>
}

/**
 * Close a data channel. Closing is best-effort and wrapped so a synchronous
 * throw from an already-closed or stale channel cannot escape and abort
 * disposal of the remaining early channels.
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
  private readonly maxEarlyStreams: number
  private readonly earlyDataChannels: EarlyDataChannel[]
  private handedOff = false

  constructor (init: DataChannelMuxerFactoryInit) {
    this.onEarlyDataChannel = this.onEarlyDataChannel.bind(this)

    this.peerConnection = init.peerConnection
    this.metrics = init.metrics
    this.log = init.log
    this.protocol = init.protocol ?? MUXER_PROTOCOL
    this.dataChannelOptions = init.dataChannelOptions ?? {}
    this.maxEarlyStreams = init.maxEarlyStreams ?? DEFAULT_MAX_EARLY_STREAMS
    this.peerConnection.addEventListener('datachannel', this.onEarlyDataChannel)
    this.earlyDataChannels = []
  }

  private onEarlyDataChannel (evt: RTCDataChannelEvent): void {
    const channel = evt.channel

    // reject (don't buffer) channels beyond the count cap, keeping the connection
    if (this.earlyDataChannels.length >= this.maxEarlyStreams) {
      this.log?.('rejecting early data channel %d - too many early channels', channel.id)
      this.metrics?.increment({ early_data_channel_count_exceeded: true })
      closeChannel(channel, this.log)
      return
    }

    // deliver binary as ArrayBuffer so it can be sized and replayed to the stream
    channel.binaryType = 'arraybuffer'

    const early: EarlyDataChannel = {
      channel,
      messages: []
    }

    // buffer until the muxer adopts the channel, bounded so a remote cannot hold
    // unbounded data pre-admission. Must stay on `.onmessage` so `createStream`
    // can overwrite it on adoption (see stream.ts)
    channel.onmessage = (messageEvent) => {
      const { data } = messageEvent

      // text frames arrive as strings despite binaryType - can't size them, reject
      if (!(data instanceof ArrayBuffer)) {
        this.closeEarlyDataChannel(early, 'invalid_message')
        return
      }

      // cap count too, else a flood of ~0-byte messages evades the byte cap
      if (early.messages.length >= MAX_EARLY_DATA_CHANNEL_MESSAGES) {
        this.closeEarlyDataChannel(early, 'message_count_exceeded')
        return
      }

      const buffered = early.messages.reduce((total, m) => total + m.data.byteLength, 0)
      if (buffered + data.byteLength > MAX_EARLY_DATA_CHANNEL_BYTES) {
        this.closeEarlyDataChannel(early, 'byte_count_exceeded')
        return
      }

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
      maxEarlyStreams: this.maxEarlyStreams,
      earlyDataChannels: this.earlyDataChannels
    })
  }

  /**
   * Discards any early data channels buffered before the muxer was created and
   * detaches the `datachannel` listener. Called by the transport whenever
   * connection establishment fails; it is a no-op once `createStreamMuxer` has
   * handed the channels to the muxer, and otherwise ensures a peer whose
   * connection is rejected cannot leave buffered data or listeners behind.
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
   * Incoming data channels opened by the remote before the muxer was created,
   * along with the messages that arrived on them in that window
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
        try {
          this.onDataChannel(channel, messages)
        } catch (err) {
          this.log.error('error adopting early data channel %d - %e', channel.id, err)
        }
      })
    })
  }

  private onDataChannel (channel: RTCDataChannel, earlyMessages?: MessageEvent[]): void {
    this.log('incoming datachannel with channel id %d, protocol %s and status %s', channel.id, channel.protocol, channel.readyState)

    // 'init' channel is only used during connection establishment, it is
    // closed by the initiator
    if (channel.label === 'init') {
      this.log.trace('closing init channel %d', channel.id)
      closeChannel(channel, this.log)

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
