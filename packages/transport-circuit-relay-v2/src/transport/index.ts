import { CircuitRelayTransport } from './transport.js'
import type { RelayDiscoveryComponents } from './discovery.js'
import type { ReservationStoreInit } from './reservation-store.js'
import type { Transport, Upgrader, Libp2pEvents, ConnectionGater, PeerId, TopologyFilter } from '@libp2p/interface'
import type { AddressManager, Registrar } from '@libp2p/interface-internal'
import type { TypedEventTarget } from 'main-event'

export interface CircuitRelayTransportComponents extends RelayDiscoveryComponents {
  peerId: PeerId
  registrar: Registrar
  upgrader: Upgrader
  addressManager: AddressManager
  connectionGater: ConnectionGater
  events: TypedEventTarget<Libp2pEvents>
}

/**
 * RelayConfig configures the circuit v2 relay transport.
 */
export interface CircuitRelayTransportInit extends ReservationStoreInit {
  /**
   * An optional filter used to prevent duplicate attempts to reserve relay
   * slots on the same peer
   */
  discoveryFilter?: TopologyFilter

  /**
   * The maximum number of simultaneous STOP inbound streams that can be open at
   * once - each inbound relayed connection uses a STOP stream
   *
   * @default 300
   */
  maxInboundStopStreams?: number

  /**
   * The maximum number of simultaneous STOP outbound streams that can be open
   * at once. If this transport is used along with the relay server these
   * settings should be set to the same value
   *
   * @default 300
   */
  maxOutboundStopStreams?: number

  /**
   * Incoming STOP requests (e.g. when a remote peer wants to dial us via a
   * relay) must finish the initial protocol negotiation within this timeout in
   * ms
   *
   * @deprecated Configure `connectionManager.inboundUpgradeTimeout` instead
   */
  stopTimeout?: number

  /**
   * When creating a reservation it must complete within this number of ms
   *
   * @default 10_000
   */
  reservationCompletionTimeout?: number
}

export function circuitRelayTransport (init: CircuitRelayTransportInit = {}): (components: CircuitRelayTransportComponents) => Transport {
  return (components) => {
    return new CircuitRelayTransport(components, init)
  }
}
