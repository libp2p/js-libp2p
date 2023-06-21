import { logger } from '@libp2p/logger'
import { nopSink, nopSource } from './util.js'
import type { MultiaddrConnection, MultiaddrConnectionTimeline } from '@libp2p/interface/connection'
import type { CounterGroup } from '@libp2p/interface/metrics'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { Source, Sink } from 'it-stream-types'

const log = logger('libp2p:webrtc:connection')

interface WebRTCMultiaddrConnectionInit {
  /**
   * WebRTC Peer Connection
   */
  peerConnection: RTCPeerConnection

  /**
   * The multiaddr address used to communicate with the remote peer
   */
  remoteAddr: Multiaddr

  /**
   * Holds the relevant events timestamps of the connection
   */
  timeline: MultiaddrConnectionTimeline

  /**
   * Optional metrics counter group for this connection
   */
  metrics?: CounterGroup
}

export class WebRTCMultiaddrConnection implements MultiaddrConnection {
  /**
   * WebRTC Peer Connection
   */
  readonly peerConnection: RTCPeerConnection

  /**
   * The multiaddr address used to communicate with the remote peer
   */
  remoteAddr: Multiaddr

  /**
   * Holds the lifecycle times of the connection
   */
  timeline: MultiaddrConnectionTimeline

  /**
   * Optional metrics counter group for this connection
   */
  metrics?: CounterGroup

  /**
   * The stream source, a no-op as the transport natively supports multiplexing
   */
  source: AsyncGenerator<Uint8Array, any, unknown> = nopSource()

  /**
   * The stream destination, a no-op as the transport natively supports multiplexing
   */
  sink: Sink<Source<Uint8Array>, Promise<void>> = nopSink

  constructor (init: WebRTCMultiaddrConnectionInit) {
    this.remoteAddr = init.remoteAddr
    this.timeline = init.timeline
    this.peerConnection = init.peerConnection

    this.peerConnection.onconnectionstatechange = () => {
      if (this.peerConnection.connectionState === 'closed' || this.peerConnection.connectionState === 'disconnected' || this.peerConnection.connectionState === 'failed') {
        this.timeline.close = Date.now()
      }
    }
  }

  async close (err?: Error | undefined): Promise<void> {
    if (err !== undefined) {
      log.error('error closing connection', err)
    }
    log.trace('closing connection')

    this.timeline.close = Date.now()
    this.peerConnection.close()
    this.metrics?.increment({ close: true })
  }
}
