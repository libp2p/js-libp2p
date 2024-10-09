import { ListenError, TypedEventEmitter } from '@libp2p/interface'
import { PeerMap } from '@libp2p/peer-collections'
import { multiaddr } from '@multiformats/multiaddr'
import type { ReservationStore } from './reservation-store.js'
import type { ComponentLogger, Logger, PeerId, Listener, ListenerEvents } from '@libp2p/interface'
import type { ConnectionManager } from '@libp2p/interface-internal'
import type { Multiaddr } from '@multiformats/multiaddr'

export interface CircuitRelayTransportListenerComponents {
  connectionManager: ConnectionManager
  relayStore: ReservationStore
  logger: ComponentLogger
}

class CircuitRelayTransportListener extends TypedEventEmitter<ListenerEvents> implements Listener {
  private readonly connectionManager: ConnectionManager
  private readonly reservationStore: ReservationStore
  private readonly listeningAddrs: PeerMap<Multiaddr[]>
  private readonly log: Logger

  constructor (components: CircuitRelayTransportListenerComponents) {
    super()

    this.log = components.logger.forComponent('libp2p:circuit-relay:transport:listener')
    this.connectionManager = components.connectionManager
    this.reservationStore = components.relayStore
    this.listeningAddrs = new PeerMap()

    // remove listening addrs when a relay is removed
    this.reservationStore.addEventListener('relay:removed', this._onRemoveRelayPeer)
  }

  _onRemoveRelayPeer = (evt: CustomEvent<PeerId>): void => {
    const had = this.listeningAddrs.has(evt.detail)

    this.log('relay peer removed %p - had reservation', evt.detail, had)

    if (!had) {
      return
    }

    this.listeningAddrs.delete(evt.detail)

    // announce listen addresses change
    this.safeDispatchEvent('listening')
  }

  async listen (addr: Multiaddr): Promise<void> {
    this.log('listen on %a', addr)

    // remove the circuit part to get the peer id of the relay
    const relayAddr = addr.decapsulate('/p2p-circuit')
    const relayConn = await this.connectionManager.openConnection(relayAddr)

    if (!this.reservationStore.hasReservation(relayConn.remotePeer)) {
      this.log('making reservation on peer %p', relayConn.remotePeer)
      // addRelay calls transportManager.listen which calls this listen method
      await this.reservationStore.addRelay(relayConn.remotePeer, 'configured')
      return
    }

    const reservation = this.reservationStore.getReservation(relayConn.remotePeer)

    if (reservation == null) {
      throw new ListenError('Did not have reservation after making reservation')
    }

    if (this.listeningAddrs.has(relayConn.remotePeer)) {
      this.log('already listening on relay %p', relayConn.remotePeer)
      return
    }

    // add all addresses from the relay reservation
    this.listeningAddrs.set(relayConn.remotePeer, reservation.addrs
      .map(buf => multiaddr(buf).encapsulate('/p2p-circuit'))
    )

    this.safeDispatchEvent('listening')
  }

  getAddrs (): Multiaddr[] {
    return [...this.listeningAddrs.values()].flat()
  }

  async close (): Promise<void> {
    await this.reservationStore.cancelReservations()
    this.listeningAddrs.clear()

    // remove listener
    this.reservationStore.removeEventListener('relay:removed', this._onRemoveRelayPeer)

    // announce listen addresses change
    this.safeDispatchEvent('close')
  }
}

export function createListener (options: CircuitRelayTransportListenerComponents): Listener {
  return new CircuitRelayTransportListener(options)
}
