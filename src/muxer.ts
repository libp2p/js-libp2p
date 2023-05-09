import { WebRTCStream } from './stream.js'
import { nopSink, nopSource } from './util.js'
import type { Stream } from '@libp2p/interface-connection'
import type { CounterGroup } from '@libp2p/interface-metrics'
import type { StreamMuxer, StreamMuxerFactory, StreamMuxerInit } from '@libp2p/interface-stream-muxer'
import type { Source, Sink } from 'it-stream-types'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface DataChannelMuxerFactoryInit {
  peerConnection: RTCPeerConnection
  metrics?: CounterGroup
}

export class DataChannelMuxerFactory implements StreamMuxerFactory {
  /**
   * WebRTC Peer Connection
   */
  private readonly peerConnection: RTCPeerConnection
  private streamBuffer: WebRTCStream[] = []
  private readonly metrics?: CounterGroup

  constructor (peerConnection: RTCPeerConnection, metrics?: CounterGroup, readonly protocol = '/webrtc') {
    this.peerConnection = peerConnection
    // store any datachannels opened before upgrade has been completed
    this.peerConnection.ondatachannel = ({ channel }) => {
      const stream = new WebRTCStream({
        channel,
        stat: {
          direction: 'inbound',
          timeline: { open: 0 }
        },
        closeCb: (_stream) => {
          this.streamBuffer = this.streamBuffer.filter(s => !_stream.eq(s))
        }
      })
      this.streamBuffer.push(stream)
    }
    this.metrics = metrics
  }

  createStreamMuxer (init?: StreamMuxerInit | undefined): StreamMuxer {
    return new DataChannelMuxer(this.peerConnection, this.streamBuffer, this.protocol, init, this.metrics)
  }
}

/**
 * A libp2p data channel stream muxer
 */
export class DataChannelMuxer implements StreamMuxer {
  /**
   * WebRTC Peer Connection
   */
  private readonly peerConnection: RTCPeerConnection

  /**
   * Optional metrics for this data channel muxer
   */
  private readonly metrics?: CounterGroup

  /**
   * Array of streams in the data channel
   */
  streams: Stream[] = []

  /**
   * Initialized stream muxer
   */
  init?: StreamMuxerInit

  /**
   * Close or abort all tracked streams and stop the muxer
   */
  close: (err?: Error | undefined) => void = () => { }

  /**
   * The stream source, a no-op as the transport natively supports multiplexing
   */
  source: AsyncGenerator<Uint8Array, any, unknown> = nopSource()

  /**
   * The stream destination, a no-op as the transport natively supports multiplexing
   */
  sink: Sink<Source<Uint8Array | Uint8ArrayList>, Promise<void>> = nopSink

  constructor (peerConnection: RTCPeerConnection, streams: Stream[], readonly protocol: string = '/webrtc', init?: StreamMuxerInit, metrics?: CounterGroup) {
    /**
     * Initialized stream muxer
     */
    this.init = init

    /**
     * WebRTC Peer Connection
     */
    this.peerConnection = peerConnection

    /**
     * Fired when a data channel has been added to the connection has been
     * added by the remote peer.
     *
     * {@link https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/datachannel_event}
     */
    this.peerConnection.ondatachannel = ({ channel }) => {
      const stream = new WebRTCStream({
        channel,
        stat: {
          direction: 'inbound',
          timeline: {
            open: 0
          }
        },
        closeCb: this.wrapStreamEnd(init?.onIncomingStream)
      })

      this.streams.push(stream)
      if ((init?.onIncomingStream) != null) {
        this.metrics?.increment({ incoming_stream: true })
        init.onIncomingStream(stream)
      }
    }

    // wrap open streams with the onStreamEnd callback
    this.streams = streams
      .filter(stream => stream.stat.timeline.close == null)
      .map(stream => {
        (stream as WebRTCStream).closeCb = this.wrapStreamEnd(init?.onStreamEnd)
        return stream
      })
    const onIncomingStream = init?.onIncomingStream
    if (onIncomingStream != null) {
      this.streams.forEach(s => { onIncomingStream(s) })
    }
  }

  newStream (): Stream {
    // The spec says the label SHOULD be an empty string: https://github.com/libp2p/specs/blob/master/webrtc/README.md#rtcdatachannel-label
    const channel = this.peerConnection.createDataChannel('')
    const closeCb = (stream: Stream): void => {
      this.metrics?.increment({ stream_end: true })
      this.init?.onStreamEnd?.(stream)
    }
    const stream = new WebRTCStream({
      channel,
      stat: {
        direction: 'outbound',
        timeline: {
          open: 0
        }
      },
      closeCb: this.wrapStreamEnd(closeCb)
    })
    this.streams.push(stream)
    this.metrics?.increment({ outgoing_stream: true })

    return stream
  }

  private wrapStreamEnd (onStreamEnd?: (s: Stream) => void): (stream: Stream) => void {
    const self = this
    return (_stream) => {
      self.streams = self.streams.filter(s => !(_stream instanceof WebRTCStream && (_stream).eq(s)))
      if (onStreamEnd != null) {
        onStreamEnd(_stream)
      }
    }
  }
}
