import { logger } from '@libp2p/logger'
import { createStream } from './stream.js'
import { drainAndClose, nopSink, nopSource } from './util.js'
import type { DataChannelOptions } from './index.js'
import type { Stream } from '@libp2p/interface/connection'
import type { CounterGroup } from '@libp2p/interface/metrics'
import type { StreamMuxer, StreamMuxerFactory, StreamMuxerInit } from '@libp2p/interface/stream-muxer'
import type { AbortOptions } from '@multiformats/multiaddr'
import type { Source, Sink } from 'it-stream-types'
import type { Uint8ArrayList } from 'uint8arraylist'

const log = logger('libp2p:webrtc:muxer')

const PROTOCOL = '/webrtc'

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

  dataChannelOptions?: DataChannelOptions
}

interface BufferedStream {
  stream: Stream
  channel: RTCDataChannel
  onEnd(err?: Error): void
}

export class DataChannelMuxerFactory implements StreamMuxerFactory {
  public readonly protocol: string

  /**
   * WebRTC Peer Connection
   */
  private readonly peerConnection: RTCPeerConnection
  private bufferedStreams: BufferedStream[] = []
  private readonly metrics?: CounterGroup
  private readonly dataChannelOptions?: DataChannelOptions

  constructor (init: DataChannelMuxerFactoryInit) {
    this.peerConnection = init.peerConnection
    this.metrics = init.metrics
    this.protocol = init.protocol ?? PROTOCOL
    this.dataChannelOptions = init.dataChannelOptions ?? {}

    // store any datachannels opened before upgrade has been completed
    this.peerConnection.ondatachannel = ({ channel }) => {
      // @ts-expect-error fields are set below
      const bufferedStream: BufferedStream = {}

      const stream = createStream({
        channel,
        direction: 'inbound',
        onEnd: (err) => {
          bufferedStream.onEnd(err)
        },
        ...this.dataChannelOptions
      })

      bufferedStream.stream = stream
      bufferedStream.channel = channel
      bufferedStream.onEnd = () => {
        this.bufferedStreams = this.bufferedStreams.filter(s => s.stream.id !== stream.id)
      }

      this.bufferedStreams.push(bufferedStream)
    }
  }

  createStreamMuxer (init?: StreamMuxerInit): StreamMuxer {
    return new DataChannelMuxer({
      ...init,
      peerConnection: this.peerConnection,
      dataChannelOptions: this.dataChannelOptions,
      metrics: this.metrics,
      streams: this.bufferedStreams,
      protocol: this.protocol
    })
  }
}

export interface DataChannelMuxerInit extends DataChannelMuxerFactoryInit, StreamMuxerInit {
  streams: BufferedStream[]
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
  private readonly dataChannelOptions: DataChannelOptions
  private readonly metrics?: CounterGroup

  constructor (readonly init: DataChannelMuxerInit) {
    this.streams = init.streams.map(s => s.stream)
    this.peerConnection = init.peerConnection
    this.protocol = init.protocol ?? PROTOCOL
    this.metrics = init.metrics
    this.dataChannelOptions = init.dataChannelOptions ?? {}

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
        onEnd: () => {
          this.#onStreamEnd(stream, channel)
        },
        ...this.dataChannelOptions
      })

      this.streams.push(stream)
      this.metrics?.increment({ incoming_stream: true })
      init?.onIncomingStream?.(stream)
    }

    // the DataChannelMuxer constructor is called during set up of the
    // connection by the upgrader.
    //
    // If we invoke `init.onIncomingStream` immediately, the connection object
    // will not be set up yet so add a tiny delay before letting the
    // connection know about early streams
    if (this.init.streams.length > 0) {
      queueMicrotask(() => {
        this.init.streams.forEach(bufferedStream => {
          bufferedStream.onEnd = () => {
            this.#onStreamEnd(bufferedStream.stream, bufferedStream.channel)
          }

          this.metrics?.increment({ incoming_stream: true })
          this.init?.onIncomingStream?.(bufferedStream.stream)
        })
      })
    }
  }

  #onStreamEnd (stream: Stream, channel: RTCDataChannel): void {
    log.trace('stream %s %s %s onEnd', stream.direction, stream.id, stream.protocol)
    drainAndClose(channel, `${stream.direction} ${stream.id} ${stream.protocol}`, this.dataChannelOptions.drainTimeout)
    this.streams = this.streams.filter(s => s.id !== stream.id)
    this.metrics?.increment({ stream_end: true })
    this.init?.onStreamEnd?.(stream)
  }

  /**
   * Gracefully close all tracked streams and stop the muxer
   */
  async close (options?: AbortOptions): Promise<void> {
    try {
      await Promise.all(
        this.streams.map(async stream => stream.close(options))
      )
    } catch (err: any) {
      this.abort(err)
    }
  }

  /**
   * Abort all tracked streams and stop the muxer
   */
  abort (err: Error): void {
    for (const stream of this.streams) {
      stream.abort(err)
    }
  }

  /**
   * The stream source, a no-op as the transport natively supports multiplexing
   */
  source: AsyncGenerator<Uint8Array, any, unknown> = nopSource()

  /**
   * The stream destination, a no-op as the transport natively supports multiplexing
   */
  sink: Sink<Source<Uint8Array | Uint8ArrayList>, Promise<void>> = nopSink

  newStream (): Stream {
    // The spec says the label SHOULD be an empty string: https://github.com/libp2p/specs/blob/master/webrtc/README.md#rtcdatachannel-label
    const channel = this.peerConnection.createDataChannel('')
    const stream = createStream({
      channel,
      direction: 'outbound',
      onEnd: () => {
        this.#onStreamEnd(stream, channel)
      },
      ...this.dataChannelOptions
    })
    this.streams.push(stream)
    this.metrics?.increment({ outgoing_stream: true })

    return stream
  }
}
