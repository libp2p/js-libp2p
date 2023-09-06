import { createStream } from './stream.js'
import { nopSink, nopSource } from './util.js'
import type { DataChannelOpts } from './stream.js'
import type { Stream } from '@libp2p/interface/connection'
import type { CounterGroup } from '@libp2p/interface/metrics'
import type { StreamMuxer, StreamMuxerFactory, StreamMuxerInit } from '@libp2p/interface/stream-muxer'
import type { AbortOptions } from '@multiformats/multiaddr'
import type { Source, Sink } from 'it-stream-types'
import type { Uint8ArrayList } from 'uint8arraylist'

const PROTOCOL = '/webrtc'

export interface DataChannelMuxerFactoryInit {
  /**
   * WebRTC Peer Connection
   */
  peerConnection: RTCPeerConnection

  /**
   * Optional metrics for this data channel muxer
   */
  metrics?: CounterGroup

  /**
   * Data channel options
   */
  dataChannelOptions?: Partial<DataChannelOpts>

  /**
   * The protocol to use
   */
  protocol?: string
}

export class DataChannelMuxerFactory implements StreamMuxerFactory {
  public readonly protocol: string

  /**
   * WebRTC Peer Connection
   */
  private readonly peerConnection: RTCPeerConnection
  private streamBuffer: Stream[] = []
  private readonly metrics?: CounterGroup
  private readonly dataChannelOptions?: Partial<DataChannelOpts>

  constructor (init: DataChannelMuxerFactoryInit) {
    this.peerConnection = init.peerConnection
    this.metrics = init.metrics
    this.protocol = init.protocol ?? PROTOCOL
    this.dataChannelOptions = init.dataChannelOptions

    // store any datachannels opened before upgrade has been completed
    this.peerConnection.ondatachannel = ({ channel }) => {
      const stream = createStream({
        channel,
        direction: 'inbound',
        dataChannelOptions: init.dataChannelOptions,
        onEnd: () => {
          this.streamBuffer = this.streamBuffer.filter(s => s.id !== stream.id)
        }
      })
      this.streamBuffer.push(stream)
    }
  }

  createStreamMuxer (init?: StreamMuxerInit): StreamMuxer {
    return new DataChannelMuxer({
      ...init,
      peerConnection: this.peerConnection,
      dataChannelOptions: this.dataChannelOptions,
      metrics: this.metrics,
      streams: this.streamBuffer,
      protocol: this.protocol
    })
  }
}

export interface DataChannelMuxerInit extends DataChannelMuxerFactoryInit, StreamMuxerInit {
  streams: Stream[]
}

/**
 * A libp2p data channel stream muxer
 */
export class DataChannelMuxer implements StreamMuxer {
  /**
   * Array of streams in the data channel
   */
  public streams: Stream[]
  public protocol: string

  private readonly peerConnection: RTCPeerConnection
  private readonly dataChannelOptions?: DataChannelOpts
  private readonly metrics?: CounterGroup

  /**
   * Gracefully close all tracked streams and stop the muxer
   */
  close: (options?: AbortOptions) => Promise<void> = async () => { }

  /**
   * Abort all tracked streams and stop the muxer
   */
  abort: (err: Error) => void = () => { }

  /**
   * The stream source, a no-op as the transport natively supports multiplexing
   */
  source: AsyncGenerator<Uint8Array, any, unknown> = nopSource()

  /**
   * The stream destination, a no-op as the transport natively supports multiplexing
   */
  sink: Sink<Source<Uint8Array | Uint8ArrayList>, Promise<void>> = nopSink

  constructor (readonly init: DataChannelMuxerInit) {
    this.streams = init.streams
    this.peerConnection = init.peerConnection
    this.protocol = init.protocol ?? PROTOCOL
    this.metrics = init.metrics

    /**
     * Fired when a data channel has been added to the connection has been
     * added by the remote peer.
     *
     * {@link https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/datachannel_event}
     */
    this.peerConnection.ondatachannel = ({ channel }) => {
      const stream = createStream({
        channel,
        direction: 'inbound',
        dataChannelOptions: this.dataChannelOptions,
        onEnd: () => {
          this.streams = this.streams.filter(s => s.id !== stream.id)
          this.metrics?.increment({ stream_end: true })
          init?.onStreamEnd?.(stream)
        }
      })

      this.streams.push(stream)
      if ((init?.onIncomingStream) != null) {
        this.metrics?.increment({ incoming_stream: true })
        init.onIncomingStream(stream)
      }
    }

    const onIncomingStream = init?.onIncomingStream
    if (onIncomingStream != null) {
      this.streams.forEach(s => { onIncomingStream(s) })
    }
  }

  newStream (): Stream {
    // The spec says the label SHOULD be an empty string: https://github.com/libp2p/specs/blob/master/webrtc/README.md#rtcdatachannel-label
    const channel = this.peerConnection.createDataChannel('')
    const stream = createStream({
      channel,
      direction: 'outbound',
      dataChannelOptions: this.dataChannelOptions,
      onEnd: () => {
        channel.close() // Stream initiator is responsible for closing the channel
        this.streams = this.streams.filter(s => s.id !== stream.id)
        this.metrics?.increment({ stream_end: true })
        this.init?.onStreamEnd?.(stream)
      }
    })
    this.streams.push(stream)
    this.metrics?.increment({ outgoing_stream: true })

    return stream
  }
}
