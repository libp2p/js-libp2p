import { type DataChannelOpts, WebRTCStream } from './stream.js'
import { nopSink, nopSource } from './util.js'
import type { Stream } from '@libp2p/interface-connection'
import type { CounterGroup } from '@libp2p/interface-metrics'
import type { StreamMuxer, StreamMuxerFactory, StreamMuxerInit } from '@libp2p/interface-stream-muxer'
import type { Source, Sink } from 'it-stream-types'
import type { Uint8ArrayList } from 'uint8arraylist'

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
}

export class DataChannelMuxerFactory implements StreamMuxerFactory {
  /**
   * WebRTC Peer Connection
   */
  private streamBuffer: WebRTCStream[] = []

  constructor (readonly init: DataChannelMuxerFactoryInit, readonly protocol = '/webrtc') {
    // store any datachannels opened before upgrade has been completed
    this.init.peerConnection.ondatachannel = ({ channel }) => {
      const stream = new WebRTCStream({
        channel,
        stat: {
          direction: 'inbound',
          timeline: { open: 0 }
        },
        dataChannelOptions: init.dataChannelOptions,
        closeCb: (_stream) => {
          this.streamBuffer = this.streamBuffer.filter(s => !_stream.eq(s))
        }
      })
      this.streamBuffer.push(stream)
    }
  }

  createStreamMuxer (init?: StreamMuxerInit | undefined): StreamMuxer {
    return new DataChannelMuxer(this.init, this.streamBuffer, this.protocol, init)
  }
}

/**
 * A libp2p data channel stream muxer
 */
export class DataChannelMuxer implements StreamMuxer {
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

  constructor (readonly dataChannelMuxer: DataChannelMuxerFactoryInit, streams: Stream[], readonly protocol: string = '/webrtc', init?: StreamMuxerInit) {
    /**
     * Initialized stream muxer
     */
    this.init = init

    /**
     * Fired when a data channel has been added to the connection has been
     * added by the remote peer.
     *
     * {@link https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/datachannel_event}
     */
    this.dataChannelMuxer.peerConnection.ondatachannel = ({ channel }) => {
      const stream = new WebRTCStream({
        channel,
        stat: {
          direction: 'inbound',
          timeline: {
            open: 0
          }
        },
        dataChannelOptions: dataChannelMuxer.dataChannelOptions,
        closeCb: this.wrapStreamEnd(init?.onIncomingStream)
      })

      this.streams.push(stream)
      if ((init?.onIncomingStream) != null) {
        this.dataChannelMuxer.metrics?.increment({ incoming_stream: true })
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
    const channel = this.dataChannelMuxer.peerConnection.createDataChannel('')
    const closeCb = (stream: Stream): void => {
      this.dataChannelMuxer.metrics?.increment({ stream_end: true })
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
      dataChannelOptions: this.dataChannelMuxer.dataChannelOptions,
      closeCb: this.wrapStreamEnd(closeCb)
    })
    this.streams.push(stream)
    this.dataChannelMuxer.metrics?.increment({ outgoing_stream: true })

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
