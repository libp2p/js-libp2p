import { CodeError } from '@libp2p/interfaces/errors'
import { EventEmitter } from '@libp2p/interfaces/events'
import { logger } from '@libp2p/logger'
import { PeerMap } from '@libp2p/peer-collections'
import { peerIdFromString } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import type { ReservationStore } from './reservation-store.js'
import type { Connection } from '@libp2p/interface-connection'
import type { ConnectionManager } from '@libp2p/interface-connection-manager'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { Listener, ListenerEvents } from '@libp2p/interface-transport'
import type { Multiaddr } from '@multiformats/multiaddr'

const log = logger('libp2p:circuit-relay:transport:listener')

export interface CircuitRelayTransportListenerComponents {
  connectionManager: ConnectionManager
  relayStore: ReservationStore
}

class CircuitRelayTransportListener extends EventEmitter<ListenerEvents> implements Listener {
  private readonly connectionManager: ConnectionManager
  private readonly relayStore: ReservationStore
  private readonly listeningAddrs: PeerMap<Multiaddr[]>

  constructor (components: CircuitRelayTransportListenerComponents) {
    super()

    this.connectionManager = components.connectionManager
    this.relayStore = components.relayStore
    this.listeningAddrs = new PeerMap()

    // remove listening addrs when a relay is removed
    this.relayStore.addEventListener('relay:removed', (evt) => {
      this.#removeRelayPeer(evt.detail)
    })
  }

  async listen (addr: Multiaddr): Promise<void> {
    log('listen on %s', addr)

    const relayPeerStr = addr.getPeerId()
    let relayConn: Connection | undefined

    // check if we already have a connection to the relay
    if (relayPeerStr != null) {
      const relayPeer = peerIdFromString(relayPeerStr)
      const connections = this.connectionManager.getConnectionsMap().get(relayPeer) ?? []

      if (connections.length > 0) {
        relayConn = connections[0]
      }
    }

    // open a new connection as we don't already have one
    if (relayConn == null) {
      const addrString = addr.toString().split('/p2p-circuit').find(a => a !== '')
      const ma = multiaddr(addrString)
      relayConn = await this.connectionManager.openConnection(ma)
    }

    if (!this.relayStore.hasReservation(relayConn.remotePeer)) {
      // addRelay calls transportManager.listen which calls this listen method
      await this.relayStore.addRelay(relayConn.remotePeer, 'configured')
      return
    }

    const reservation = this.relayStore.getReservation(relayConn.remotePeer)

    if (reservation == null) {
      throw new CodeError('Did not have reservation after making reservation', 'ERR_NO_RESERVATION')
    }

    if (this.listeningAddrs.has(relayConn.remotePeer)) {
      log('already listening on relay %p', relayConn.remotePeer)
      return
    }

    // add all addresses from the relay reservation
    this.listeningAddrs.set(relayConn.remotePeer, reservation.addrs.map(buf => {
      return multiaddr(buf).encapsulate('/p2p-circuit')
    }))

    this.safeDispatchEvent('listening', {})
  }

  getAddrs (): Multiaddr[] {
    return [...this.listeningAddrs.values()].flat()
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
