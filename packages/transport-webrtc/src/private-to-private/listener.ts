import { TypedEventEmitter } from '@libp2p/interface'
import { P2P } from '@multiformats/multiaddr-matcher'
import { fmt, literal } from '@multiformats/multiaddr-matcher/utils'
import type { PeerId, ListenerEvents, Listener } from '@libp2p/interface'
import type { TransportManager } from '@libp2p/interface-internal'
import type { Multiaddr } from '@multiformats/multiaddr'

const Circuit = fmt(P2P.matchers[0], literal('p2p-circuit'))

export interface WebRTCPeerListenerComponents {
  peerId: PeerId
  transportManager: TransportManager
}

export interface WebRTCPeerListenerInit {
  shutdownController: AbortController
}

export class WebRTCPeerListener extends TypedEventEmitter<ListenerEvents> implements Listener {
  private readonly transportManager: TransportManager
  private readonly shutdownController: AbortController

  constructor (components: WebRTCPeerListenerComponents, init: WebRTCPeerListenerInit) {
    super()

    this.transportManager = components.transportManager
    this.shutdownController = init.shutdownController
  }

  async listen (): Promise<void> {
    queueMicrotask(() => {
      this.safeDispatchEvent('listening')
    })
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
    this.shutdownController.abort()
    queueMicrotask(() => {
      this.safeDispatchEvent('close')
    })
  }
}
