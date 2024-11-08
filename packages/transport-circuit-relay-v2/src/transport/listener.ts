import { ListenError, TypedEventEmitter, setMaxListeners } from '@libp2p/interface'
import { multiaddr } from '@multiformats/multiaddr'
import { DEFAULT_RESERVATION_COMPLETION_TIMEOUT } from '../constants.js'
import { CircuitListen, CircuitSearch } from '../utils.js'
import type { RelayDiscovery } from './discovery.js'
import type { RelayReservation, ReservationStore } from './reservation-store.js'
import type { ComponentLogger, Logger, Listener, ListenerEvents, PeerId } from '@libp2p/interface'
import type { ConnectionManager } from '@libp2p/interface-internal'
import type { Multiaddr } from '@multiformats/multiaddr'

export interface CircuitRelayTransportListenerComponents {
  connectionManager: ConnectionManager
  relayStore: ReservationStore
  logger: ComponentLogger
}

export interface CircuitRelayTransportListenerInit {
  listenTimeout?: number
}

class CircuitRelayTransportListener extends TypedEventEmitter<ListenerEvents> implements Listener {
  private readonly connectionManager: ConnectionManager
  private readonly reservationStore: ReservationStore
  private readonly discovery?: RelayDiscovery
  private listeningAddrs: Multiaddr[]
  private readonly log: Logger
  private readonly listenTimeout: number
  private reservationId?: string
  private relay?: PeerId

  constructor (components: CircuitRelayTransportListenerComponents, init: CircuitRelayTransportListenerInit = {}) {
    super()

    this.log = components.logger.forComponent('libp2p:circuit-relay:transport:listener')
    this.connectionManager = components.connectionManager
    this.reservationStore = components.relayStore
    this.listeningAddrs = []
    this.listenTimeout = init.listenTimeout ?? DEFAULT_RESERVATION_COMPLETION_TIMEOUT

    // remove listening addrs when a relay is removed
    this.reservationStore.addEventListener('relay:removed', this._onRemoveRelayPeer)
    this.reservationStore.addEventListener('relay:created-reservation', this._onAddRelayPeer)
  }

  _onRemoveRelayPeer = (evt: CustomEvent<RelayReservation>): void => {
    this.log('relay removed %p our relay %p', evt.detail.relay, this.relay, this.relay?.equals(evt.detail.relay))

    if (this.relay?.equals(evt.detail.relay) !== true) {
      return
    }

    this.log('relay peer removed %p', evt.detail.relay)

    this.listeningAddrs = []

    // announce listen addresses change
    this.safeDispatchEvent('listening')
  }

  _onAddRelayPeer = (evt: CustomEvent<RelayReservation>): void => {
    const {
      relay, details
    } = evt.detail

    if (details.type === 'configured') {
      return
    }

    if (details.id !== this.reservationId) {
      return
    }

    this.log('relay peer added %p', relay)

    this.relay = relay

    // add all addresses from the relay reservation
    this.listeningAddrs = details.reservation.addrs
      .map(buf => multiaddr(buf).encapsulate('/p2p-circuit'))

    // announce listen addresses change
    this.safeDispatchEvent('listening')
  }

  async listen (addr: Multiaddr): Promise<void> {
    this.log('listen on %a', addr)

    if (CircuitSearch.exactMatch(addr)) {
      // start relay discovery
      this.reservationId = this.reservationStore.reserveRelay()
    } else if (CircuitListen.exactMatch(addr)) {
      const signal = AbortSignal.timeout(this.listenTimeout)
      setMaxListeners(Infinity, signal)

      // try to make a reservation on one particular relay
      // remove the circuit part to get the peer id of the relay
      const relayAddr = addr.decapsulate('/p2p-circuit')
      const relayConn = await this.connectionManager.openConnection(relayAddr, {
        signal
      })

      if (!this.reservationStore.hasReservation(relayConn.remotePeer)) {
        this.log('making reservation on peer %p', relayConn.remotePeer)
        const reservation = await this.reservationStore.addRelay(relayConn.remotePeer, 'configured')
        this.log('made reservation on peer %p', relayConn.remotePeer)

        this.relay = reservation.relay

        // add all addresses from the relay reservation
        this.listeningAddrs = reservation.details.reservation.addrs
          .map(buf => multiaddr(buf).encapsulate('/p2p-circuit'))

        // if that succeeded announce listen addresses change
        queueMicrotask(() => {
          this.safeDispatchEvent('listening')
        })
      }
    } else {
      throw new ListenError(`Could not listen on p2p-circuit address "${addr}"`)
    }
  }

  getAddrs (): Multiaddr[] {
    return [...this.listeningAddrs.values()].flat()
  }

  async close (): Promise<void> {
    this.reservationStore.cancelReservations()
    this.listeningAddrs = []

    // remove listener
    this.reservationStore.removeEventListener('relay:removed', this._onRemoveRelayPeer)

    // announce listen addresses change
    queueMicrotask(() => {
      this.safeDispatchEvent('close')
    })
  }
}

export function createListener (options: CircuitRelayTransportListenerComponents): Listener {
  return new CircuitRelayTransportListener(options)
}
