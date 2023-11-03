import { CodeError } from '@libp2p/interface/errors'
import { TypedEventEmitter } from '@libp2p/interface/events'
import { logger } from '@libp2p/logger'
import { PeerMap } from '@libp2p/peer-collections'
import { multiaddr } from '@multiformats/multiaddr'
import type { ReservationStore } from './reservation-store.js'
import type { PeerId } from '@libp2p/interface/peer-id'
import type { Listener, ListenerEvents } from '@libp2p/interface/transport'
import type { ConnectionManager } from '@libp2p/interface-internal/connection-manager'
import type { Multiaddr } from '@multiformats/multiaddr'

const log = logger('libp2p:circuit-relay:transport:listener')

export interface CircuitRelayTransportListenerComponents {
  connectionManager: ConnectionManager
  relayStore: ReservationStore
}

class CircuitRelayTransportListener extends TypedEventEmitter<ListenerEvents> implements Listener {
  private readonly connectionManager: ConnectionManager
  private readonly relayStore: ReservationStore
  private readonly listeningAddrs: PeerMap<Multiaddr[]>

  constructor (components: CircuitRelayTransportListenerComponents) {
    super()

    this.connectionManager = components.connectionManager
    this.relayStore = components.relayStore
    this.listeningAddrs = new PeerMap()

    // remove listening addrs when a relay is removed
    this.relayStore.addEventListener('relay:removed', this._onRemoveRelayPeer)
  }

  _onRemoveRelayPeer = (evt: CustomEvent<PeerId>): void => {
    this.#removeRelayPeer(evt.detail)
  }

  async listen (addr: Multiaddr): Promise<void> {
    log('listen on %a', addr)

    // remove the circuit part to get the peer id of the relay
    const relayAddr = addr.decapsulate('/p2p-circuit')
    const relayConn = await this.connectionManager.openConnection(relayAddr)

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

    log('relay peer removed %p - had reservation', peerId, had)

    this.listeningAddrs.delete(peerId)

    if (had) {
      log.trace('removing relay event listener for peer %p', peerId)
      this.relayStore.removeEventListener('relay:removed', this._onRemoveRelayPeer)
      // Announce listen addresses change
      this.safeDispatchEvent('close', {})
    }
  }
}

export function createListener (options: CircuitRelayTransportListenerComponents): Listener {
  return new CircuitRelayTransportListener(options)
}
