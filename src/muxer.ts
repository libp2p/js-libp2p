// import {Components} from "@libp2p/components"
import {Stream} from "@libp2p/interface-connection"
import {StreamMuxer, StreamMuxerFactory, StreamMuxerInit} from "@libp2p/interface-stream-muxer"
import {Source, Sink} from "it-stream-types"
import {v4} from "uuid"
import {WebRTCStream} from "./stream.js"
import {nopSink, nopSource} from "./util.js"

export class DataChannelMuxerFactory implements StreamMuxerFactory {
  private peerConnection: RTCPeerConnection
  protocol: string = '/webrtc'

  constructor(peerConnection: RTCPeerConnection) {
    this.peerConnection = peerConnection
  }

  createStreamMuxer(init?: StreamMuxerInit | undefined): StreamMuxer {
    return new DataChannelMuxer(this.peerConnection, init)
  }
}

export class DataChannelMuxer implements StreamMuxer {
  private readonly peerConnection: RTCPeerConnection
  readonly protocol: string = "/webrtc"
  streams: Stream[] = []
  init?: StreamMuxerInit
  close: (err?: Error | undefined) => void = () => {}

  // nop source and sink, since the transport natively supports
  // multiplexing
  source: Source<Uint8Array> = nopSource;
  sink: Sink<Uint8Array, Promise<void>> = nopSink;


  constructor(peerConnection: RTCPeerConnection, init?: StreamMuxerInit) {
    this.init = init
    this.peerConnection = peerConnection
    this.peerConnection.ondatachannel = ({channel}) => {
      const stream = new WebRTCStream({
        channel,
        stat: {
          direction: 'inbound',
          timeline: {
            open: 0,
          }
        },
        closeCb: init?.onStreamEnd
      })
      if (init?.onIncomingStream) {
        init.onIncomingStream!(stream)
      }
    }
  }

  newStream(name?: string | undefined): Stream {
    const streamName = name || v4();
    const channel = this.peerConnection.createDataChannel(streamName)
    const stream = new WebRTCStream({
      channel,
      stat: {
        direction: 'outbound',
        timeline: {
          open: 0,
        },
      },
      closeCb: this.init?.onStreamEnd
    })
    return stream
  }
}

// export {}
