import { AbstractStreamMuxer } from '@libp2p/utils'
import { MUXER_PROTOCOL } from './constants.js'
import { createStream, WebRTCStream } from './stream.js'
import type { DataChannelOptions } from './index.js'
import type { ComponentLogger, CounterGroup, StreamMuxer, StreamMuxerFactory, CreateStreamOptions, MultiaddrConnection } from '@libp2p/interface'

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
   * Options used to create data channels
   */
  dataChannelOptions?: DataChannelOptions
}

export interface DataChannelMuxerFactoryComponents {
  logger: ComponentLogger
}

export class DataChannelMuxerFactory implements StreamMuxerFactory {
  public readonly protocol: string

  /**
   * WebRTC Peer Connection
   */
  private readonly peerConnection: RTCPeerConnection
  private readonly metrics?: CounterGroup
  private readonly dataChannelOptions?: DataChannelOptions
  private readonly earlyDataChannels: RTCDataChannel[]

  constructor (init: DataChannelMuxerFactoryInit) {
    this.onEarlyDataChannel = this.onEarlyDataChannel.bind(this)

    this.peerConnection = init.peerConnection
    this.metrics = init.metrics
    this.protocol = init.protocol ?? MUXER_PROTOCOL
    this.dataChannelOptions = init.dataChannelOptions ?? {}
    this.peerConnection.addEventListener('datachannel', this.onEarlyDataChannel)
    this.earlyDataChannels = []
  }

  private onEarlyDataChannel (evt: RTCDataChannelEvent): void {
    this.earlyDataChannels.push(evt.channel)
  }

  createStreamMuxer (maConn: MultiaddrConnection): StreamMuxer {
    this.peerConnection.removeEventListener('datachannel', this.onEarlyDataChannel)

    return new DataChannelMuxer(maConn, {
      peerConnection: this.peerConnection,
      dataChannelOptions: this.dataChannelOptions,
      metrics: this.metrics,
      protocol: this.protocol,
      earlyDataChannels: this.earlyDataChannels
    })
  }
}

export interface DataChannelMuxerInit extends DataChannelMuxerFactoryInit {
  protocol: string

  /**
   * Incoming data channels that were opened by the remote before the peer
   * connection was established
   */
  earlyDataChannels: RTCDataChannel[]
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
        init.earlyDataChannels.forEach(channel => {
          channel.close()
        })
        return
      }

      init.earlyDataChannels.forEach(channel => {
        this.onDataChannel(channel)
      })
    })
  }

  private onDataChannel (channel: RTCDataChannel): void {
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
