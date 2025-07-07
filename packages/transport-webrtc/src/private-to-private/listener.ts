import { CODE_P2P_CIRCUIT } from '@multiformats/multiaddr'
import { P2P } from '@multiformats/multiaddr-matcher'
import { fmt, code } from '@multiformats/multiaddr-matcher/utils'
import { TypedEventEmitter } from 'main-event'
import type { PeerId, ListenerEvents, Listener, Libp2pEvents } from '@libp2p/interface'
import type { TransportManager } from '@libp2p/interface-internal'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { TypedEventTarget } from 'main-event'

const Circuit = fmt(P2P.matchers[0], code(CODE_P2P_CIRCUIT))

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
