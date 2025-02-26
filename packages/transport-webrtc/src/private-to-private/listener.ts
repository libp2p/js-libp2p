import { TypedEventEmitter } from '@libp2p/interface'
import { P2P } from '@multiformats/multiaddr-matcher'
import { fmt, literal } from '@multiformats/multiaddr-matcher/utils'
import type { PeerId, ListenerEvents, Listener, Libp2pEvents, TypedEventTarget } from '@libp2p/interface'
import type { TransportManager } from '@libp2p/interface-internal'
import type { Multiaddr } from '@multiformats/multiaddr'

const Circuit = fmt(P2P.matchers[0], literal('p2p-circuit'))

export interface WebRTCPeerListenerComponents {
  peerId: PeerId
  transportManager: TransportManager
  events: TypedEventTarget<Libp2pEvents>
}

export interface WebRTCPeerListenerInit {
  shutdownController: AbortController
}

export class WebRTCPeerListener extends TypedEventEmitter<ListenerEvents> implements Listener {
  private readonly transportManager: TransportManager
  private readonly shutdownController: AbortController
  private readonly events: TypedEventTarget<Libp2pEvents>

  constructor (components: WebRTCPeerListenerComponents, init: WebRTCPeerListenerInit) {
    super()

    this.transportManager = components.transportManager
    this.events = components.events
    this.shutdownController = init.shutdownController

    this.onTransportListening = this.onTransportListening.bind(this)
  }

  async listen (): Promise<void> {
    this.events.addEventListener('transport:listening', this.onTransportListening)
  }

  onTransportListening (event: CustomEvent<Listener>): void {
    const circuitAddresses = event.detail.getAddrs()
      .filter(ma => Circuit.exactMatch(ma))
      .map(ma => {
        return ma.encapsulate('/webrtc')
      })

    if (circuitAddresses.length > 0) {
      this.safeDispatchEvent('listening')
    }
  }

  getAddrs (): Multiaddr[] {
    return this.transportManager
      .getListeners()
      .filter(l => !(l instanceof WebRTCPeerListener))
      .map(l => l.getAddrs()
        .filter(ma => Circuit.exactMatch(ma))
        .map(ma => {
          return ma.encapsulate('/webrtc')
        })
      )
      .flat()
  }

  updateAnnounceAddrs (): void {

  }

  async close (): Promise<void> {
    this.events.removeEventListener('transport:listening', this.onTransportListening)

    this.shutdownController.abort()
    queueMicrotask(() => {
      this.safeDispatchEvent('close')
    })
  }
}
