import { TypedEventEmitter } from '@libp2p/interface'
import { Circuit } from '@multiformats/mafmt'
import type { PeerId, ListenerEvents, Listener } from '@libp2p/interface'
import type { TransportManager } from '@libp2p/interface-internal'
import type { Multiaddr } from '@multiformats/multiaddr'

export interface WebRTCPeerListenerComponents {
  peerId: PeerId
  transportManager: TransportManager
}

export interface WebRTCPeerListenerInit {
  shutdownController: AbortController
}

export class WebRTCPeerListener extends TypedEventEmitter<ListenerEvents> implements Listener {
  private readonly peerId: PeerId
  private readonly transportManager: TransportManager
  private readonly shutdownController: AbortController

  constructor (components: WebRTCPeerListenerComponents, init: WebRTCPeerListenerInit) {
    super()

    this.peerId = components.peerId
    this.transportManager = components.transportManager

    this.shutdownController = init.shutdownController
  }

  async listen (): Promise<void> {
    this.safeDispatchEvent('listening', {})
  }

  getAddrs (): Multiaddr[] {
    return this.transportManager
      .getListeners()
      .filter(l => l !== this)
      .map(l => l.getAddrs()
        .filter(ma => Circuit.matches(ma))
        .map(ma => {
          return ma.encapsulate(`/webrtc/p2p/${this.peerId}`)
        })
      )
      .flat()
  }

  async close (): Promise<void> {
    this.shutdownController.abort()
    this.safeDispatchEvent('close', {})
  }
}
