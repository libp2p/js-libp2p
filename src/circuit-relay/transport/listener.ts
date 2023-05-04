import { EventEmitter } from '@libp2p/interfaces/events'
import type { ConnectionManager } from '@libp2p/interface-connection-manager'
import type { Listener, ListenerEvents } from '@libp2p/interface-transport'
import type { Multiaddr } from '@multiformats/multiaddr'
import { multiaddr } from '@multiformats/multiaddr'
import type { ReservationStore } from './reservation-store.js'
import type { PeerId } from '@libp2p/interface-peer-id'
import { PeerMap } from '@libp2p/peer-collections'
import { logger } from '@libp2p/logger'
import type { Libp2pEvents } from '@libp2p/interface-libp2p'

const log = logger('libp2p:circuit-relay:transport:listener')

export interface CircuitRelayTransportListenerComponents {
  connectionManager: ConnectionManager
  relayStore: ReservationStore
  events: EventEmitter<Libp2pEvents>
}

class CircuitRelayTransportListener extends EventEmitter<ListenerEvents> implements Listener {
  private readonly connectionManager: ConnectionManager
  private readonly relayStore: ReservationStore
  private readonly listeningAddrs: PeerMap<Multiaddr>
  private readonly events: EventEmitter<Libp2pEvents>

  constructor (components: CircuitRelayTransportListenerComponents) {
    super()

    this.connectionManager = components.connectionManager
    this.relayStore = components.relayStore
    this.events = components.events
    this.listeningAddrs = new PeerMap()

    // remove listening addrs when a relay is removed
    this.relayStore.addEventListener('relay:removed', (evt) => {
      this.#removeRelayPeer(evt.detail)
    })

    // remove listening addrs when a peer disconnects
    this.events.addEventListener('connection:close', (evt) => {
      this.#removeRelayPeer(evt.detail.remotePeer)
    })
  }

  async listen (addr: Multiaddr): Promise<void> {
    log('listen on %s', addr)

    const addrString = addr.toString().split('/p2p-circuit').find(a => a !== '')
    const ma = multiaddr(addrString)
    const relayConn = await this.connectionManager.openConnection(ma)

    if (!this.relayStore.hasReservation(relayConn.remotePeer)) {
      // addRelay calls transportManager.listen which calls this listen method
      await this.relayStore.addRelay(relayConn.remotePeer, 'configured')
      return
    }

    if (this.listeningAddrs.has(relayConn.remotePeer)) {
      log('already listening on relay %p', relayConn.remotePeer)
      return
    }

    this.listeningAddrs.set(relayConn.remotePeer, addr)
    this.safeDispatchEvent('listening', {})
  }

  /**
   * Get fixed up multiaddrs
   *
   * NOTE: This method will grab the peers multiaddrs and expand them such that:
   *
   * a) If it's an existing /p2p-circuit address for a specific relay i.e.
   * `/ip4/0.0.0.0/tcp/0/ipfs/QmRelay/p2p-circuit` this method will expand the
   * address to `/ip4/0.0.0.0/tcp/0/ipfs/QmRelay/p2p-circuit/ipfs/QmPeer` where
   * `QmPeer` is this peers id
   * b) If it's not a /p2p-circuit address, it will encapsulate the address as a /p2p-circuit
   * addr, such when dialing over a relay with this address, it will create the circuit using
   * the encapsulated transport address. This is useful when for example, a peer should only
   * be dialed over TCP rather than any other transport
   */
  getAddrs (): Multiaddr[] {
    return [...this.listeningAddrs.values()]
  }

  async close (): Promise<void> {

  }

  #removeRelayPeer (peerId: PeerId): void {
    const had = this.listeningAddrs.has(peerId)

    this.listeningAddrs.delete(peerId)

    if (had) {
      // Announce listen addresses change
      this.safeDispatchEvent('close', {})
    }
  }
}

export function createListener (options: CircuitRelayTransportListenerComponents): Listener {
  return new CircuitRelayTransportListener(options)
}
