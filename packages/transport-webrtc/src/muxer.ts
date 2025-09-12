import { AbstractStreamMuxer } from '@libp2p/utils'
import { pEvent } from 'p-event'
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

  constructor (init: DataChannelMuxerFactoryInit) {
    this.peerConnection = init.peerConnection
    this.metrics = init.metrics
    this.protocol = init.protocol ?? MUXER_PROTOCOL
    this.dataChannelOptions = init.dataChannelOptions ?? {}
  }

  createStreamMuxer (maConn: MultiaddrConnection): StreamMuxer {
    return new DataChannelMuxer(maConn, {
      peerConnection: this.peerConnection,
      dataChannelOptions: this.dataChannelOptions,
      metrics: this.metrics,
      protocol: this.protocol
    })
  }
}

export interface DataChannelMuxerInit extends DataChannelMuxerFactoryInit {
  protocol: string
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
    this.peerConnection.addEventListener('datachannel', ({ channel }) => {
      this.log.trace('incoming %s datachannel with channel id %d, protocol %s and status %s', channel.protocol, channel.id, channel.protocol, channel.readyState)

      // 'init' channel is only used during connection establishment, it is
      // closed by the initiator
      if (channel.label === 'init') {
        this.log.trace('closing init channel')
        channel.close()

        return
      }

      const stream = createStream({
        ...this.streamOptions,
        ...this.dataChannelOptions,
        channel,
        direction: 'inbound',
        log: this.log,
        connection: this.peerConnection
      })

      this.onRemoteStream(stream)
    })
  }

  async onCreateStream (options?: CreateStreamOptions): Promise<WebRTCStream> {
    // The spec says the label MUST be an empty string: https://github.com/libp2p/specs/blob/master/webrtc/README.md#rtcdatachannel-label
    const channel = this.peerConnection.createDataChannel('', {
      // TODO: pre-negotiate stream protocol
      // protocol: options?.protocol
    })

    this.log('open channel %d for protocol %s', channel.id, options?.protocol)

    if (channel.readyState !== 'open') {
      this.log('outbound channel %d state is "%s" and not "open", waiting for "open" event before returning new channel', channel.id, channel.readyState)
      await pEvent(channel, 'open', {
        ...options,
        rejectionEvents: [
          'close'
        ]
      })

      this.log('outbound channel %d state is now "%s", returning new channel', channel.id, channel.readyState)
    }

    const stream = createStream({
      ...options,
      ...this.dataChannelOptions,
      channel,
      direction: 'outbound',
      log: this.log,
      connection: this.peerConnection
    })

    return stream
  }

  onData (): void {

  }
}
