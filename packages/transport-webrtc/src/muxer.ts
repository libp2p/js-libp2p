import { AbstractStreamMuxer } from '@libp2p/utils'
import { raceEvent } from 'race-event'
import { MUXER_PROTOCOL } from './constants.js'
import { createStream } from './stream.js'
import type { DataChannelOptions } from './index.js'
import type { ComponentLogger, Stream, CounterGroup, StreamMuxer, StreamMuxerFactory, StreamMuxerInit, CreateStreamOptions } from '@libp2p/interface'

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

  createStreamMuxer (init: StreamMuxerInit): StreamMuxer {
    return new DataChannelMuxer({
      ...init,
      peerConnection: this.peerConnection,
      dataChannelOptions: this.dataChannelOptions,
      metrics: this.metrics,
      protocol: this.protocol
    })
  }
}

export interface DataChannelMuxerInit extends DataChannelMuxerFactoryInit, StreamMuxerInit {
  protocol: string
}

export interface DataChannelMuxerComponents {
  logger: ComponentLogger
}

/**
 * A libp2p data channel stream muxer
 */
export class DataChannelMuxer extends AbstractStreamMuxer implements StreamMuxer {
  private readonly peerConnection: RTCPeerConnection
  private readonly dataChannelOptions: DataChannelOptions
  private readonly metrics?: CounterGroup

  constructor (init: DataChannelMuxerInit) {
    super({
      ...init,
      log: init.maConn.log.newScope('muxer')
    })

    this.peerConnection = init.peerConnection
    this.protocol = init.protocol ?? MUXER_PROTOCOL
    this.metrics = init.metrics
    this.dataChannelOptions = init.dataChannelOptions ?? {}

    /**
     * Fired when a data channel has been added to the connection has been
     * added by the remote peer.
     *
     * {@link https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/datachannel_event}
     */
    this.peerConnection.ondatachannel = ({ channel }) => {
      this.log.trace('incoming datachannel with channel id %d', channel.id)

      // 'init' channel is only used during connection establishment
      if (channel.label === 'init') {
        this.log.trace('closing init channel')
        channel.close()

        return
      }

      const stream = createStream({
        channel,
        direction: 'inbound',
        log: this.log,
        ...this.dataChannelOptions
      })

      this.onRemoteStream(stream)
    }
  }

  async onCreateStream (options?: CreateStreamOptions): Promise<Stream> {
    // The spec says the label MUST be an empty string: https://github.com/libp2p/specs/blob/master/webrtc/README.md#rtcdatachannel-label
    const channel = this.peerConnection.createDataChannel('', {
      // TODO: pre-negotiate stream protocol
      // protocol: options?.protocol
    })

    if (channel.readyState !== 'open') {
      this.log('channel state is "%s" and not "open", waiting for "open" event before sending data', channel.readyState)
      await raceEvent(channel, 'open', options?.signal)

      this.log('channel state is now "%s", sending data', channel.readyState)
    }

    const stream = createStream({
      channel,
      direction: 'outbound',
      log: this.log,
      ...this.dataChannelOptions
    })
    this.streams.push(stream)
    this.metrics?.increment({ outgoing_stream: true })

    return stream
  }

  onData (): void {

  }
}
