import { EventEmitter } from '@libp2p/interface/events'
import { Circuit } from '@multiformats/mafmt'
import type { PeerId } from '@libp2p/interface/peer-id'
import type { ListenerEvents, Listener } from '@libp2p/interface/transport'
import type { TransportManager } from '@libp2p/interface-internal/transport-manager'
import type { Multiaddr } from '@multiformats/multiaddr'

export interface ListenerOptions {
  peerId: PeerId
  transportManager: TransportManager
}

export class WebRTCPeerListener extends EventEmitter<ListenerEvents> implements Listener {
  private readonly peerId: PeerId
  private readonly transportManager: TransportManager

  constructor (opts: ListenerOptions) {
    super()

    this.peerId = opts.peerId
    this.transportManager = opts.transportManager
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
    this.safeDispatchEvent('close', {})
  }
}
