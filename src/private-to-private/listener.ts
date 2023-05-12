import { EventEmitter } from '@libp2p/interfaces/events'
import type { Libp2pEvents } from '@libp2p/interface-libp2p'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { ListenerEvents, Listener } from '@libp2p/interface-transport'
import type { Multiaddr } from '@multiformats/multiaddr'

export interface ListenerOptions {
  peerId: PeerId
  events: EventEmitter<Libp2pEvents>
}

export class WebRTCPeerListener extends EventEmitter<ListenerEvents> implements Listener {
  private readonly peerId: PeerId
  private listeners: Listener[] = []

  constructor (opts: ListenerOptions) {
    super()

    this.peerId = opts.peerId

    opts.events.addEventListener('transport:listening', (event) => {
      const listener = event.detail

      if (listener === this || this.listeners.includes(listener)) {
        return
      }

      this.listeners.push(listener)
    })

    opts.events.addEventListener('transport:close', (event) => {
      const listener = event.detail

      this.listeners = this.listeners.filter(l => l !== listener)
    })
  }

  async listen (ma: Multiaddr): Promise<void> {
    this.safeDispatchEvent('listening', {})
  }

  getAddrs (): Multiaddr[] {
    return this.listeners
      .map(l => l.getAddrs()
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
