import type { PeerId } from '@libp2p/interface-peer-id'
import type { ListenerEvents, TransportManager, Upgrader, Listener } from '@libp2p/interface-transport'
import { EventEmitter } from '@libp2p/interfaces/events'
import { multiaddr, Multiaddr } from '@multiformats/multiaddr'
import { inappropriateMultiaddr } from '../error.js'
import { TRANSPORT } from './transport.js'

export interface ListenerOptions {
  peerId: PeerId
  upgrader: Upgrader
  transportManager: TransportManager
}

export class WebRTCPeerListener extends EventEmitter<ListenerEvents> implements Listener {
  constructor (
    private readonly opts: ListenerOptions
  ) {
    super()
  }

  private getBaseAddress (ma: Multiaddr): Multiaddr {
    const addrs = ma.toString().split(TRANSPORT)
    if (addrs.length < 2) {
      throw inappropriateMultiaddr('base address not found')
    }
    return multiaddr(addrs[0])
  }

  private listeningAddrs: Multiaddr[] = []
  async listen (ma: Multiaddr): Promise<void> {
    const baseAddr = this.getBaseAddress(ma)
    const tpt = this.opts.transportManager.transportForMultiaddr(baseAddr)
    const listener = tpt?.createListener({ ...this.opts })
    await listener?.listen(baseAddr)
    const listeningAddr = ma.encapsulate(`/p2p/${this.opts.peerId.toString()}`)
    this.listeningAddrs.push(listeningAddr)
    listener?.addEventListener('close', () => {
      this.listeningAddrs = this.listeningAddrs.filter(a => a !== listeningAddr)
    })
  }

  getAddrs (): Multiaddr[] { return this.listeningAddrs }
  async close (): Promise<void> { }
}
