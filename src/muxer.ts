import { Stream } from '@libp2p/interface-connection'
import { StreamMuxer, StreamMuxerFactory, StreamMuxerInit } from '@libp2p/interface-stream-muxer'
import { Source, Sink } from 'it-stream-types'

import { WebRTCStream } from './stream.js'
import { nopSink, nopSource } from './util.js'

export class DataChannelMuxerFactory implements StreamMuxerFactory {
  /**
   * WebRTC Peer Connection
   */
  private readonly peerConnection: RTCPeerConnection

  /**
   * The string representation of the protocol, requried by StreamMuxerFactory
   */
  protocol: string = '/webrtc'

  constructor (peerConnection: RTCPeerConnection) {
    this.peerConnection = peerConnection
  }

  createStreamMuxer (init?: StreamMuxerInit | undefined): StreamMuxer {
    return new DataChannelMuxer(this.peerConnection, init)
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
   * The protocol as represented in the multiaddress
   */
  readonly protocol: string = '/webrtc'

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
  close: (err?: Error | undefined) => void = () => {}

  /**
   * The stream source, a no-op as the transport natively supports multiplexing
   */
  source: Source<Uint8Array> = nopSource;

  /**
   * The stream destination, a no-op as the transport natively supports multiplexing
   */
  sink: Sink<Uint8Array, Promise<void>> = nopSink;

  constructor (peerConnection: RTCPeerConnection, init?: StreamMuxerInit) {
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
        closeCb: init?.onStreamEnd
      })

      if ((init?.onIncomingStream) != null) {
        init.onIncomingStream(stream)
      }
    }
  }

  /**
   * Initiate a new stream with the given name. If no name is
   * provided, the id of the stream will be used.
   */
  newStream (name: string = ''): Stream {
    const channel = this.peerConnection.createDataChannel(name)
    const stream = new WebRTCStream({
      channel,
      stat: {
        direction: 'outbound',
        timeline: {
          open: 0
        }
      },
      closeCb: this.init?.onStreamEnd
    })

    return stream
  }
}
