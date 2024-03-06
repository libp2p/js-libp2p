import { type Transport, type Upgrader, type Libp2pEvents, type ComponentLogger, type ConnectionGater, type ContentRouting, type TypedEventTarget, type PeerId, type PeerStore } from '@libp2p/interface'
import { type RelayDiscoveryComponents } from './discovery.js'
import { type RelayStoreInit } from './reservation-store.js'
import { CircuitRelayTransport } from './transport.js'
import type { AddressManager, ConnectionManager, Registrar } from '@libp2p/interface-internal'

export interface CircuitRelayTransportComponents extends RelayDiscoveryComponents {
  peerId: PeerId
  peerStore: PeerStore
  registrar: Registrar
  connectionManager: ConnectionManager
  upgrader: Upgrader
  addressManager: AddressManager
  contentRouting: ContentRouting
  connectionGater: ConnectionGater
  events: TypedEventTarget<Libp2pEvents>
  logger: ComponentLogger
}

/**
 * RelayConfig configures the circuit v2 relay transport.
 */
export interface CircuitRelayTransportInit extends RelayStoreInit {
  /**
   * The number of peers running diable relays to search for and
   * connect to. (default: 0)
   */
  discoverRelays?: number

  /**
   * The maximum number of simultaneous STOP inbound streams that can be open at
   * once - each inbound relayed connection uses a STOP stream (default: 300)
   */
  maxInboundStopStreams?: number

  /**
   * The maximum number of simultaneous STOP outbound streams that can be open at
   * once. If this transport is used along with the relay server these settings
   * should be set to the same value (default: 300)
   */
  maxOutboundStopStreams?: number

  /**
   * Incoming STOP requests (e.g. when a remote peer wants to dial us via a relay)
   * must finish the initial protocol negotiation within this timeout in ms
   * (default: 30000)
   */
  stopTimeout?: number

  /**
   * When creating a reservation it must complete within this number of ms
   * (default: 10000)
   */
  reservationCompletionTimeout?: number
}

export function circuitRelayTransport (init: CircuitRelayTransportInit = {}): (components: CircuitRelayTransportComponents) => Transport {
  return (components) => {
    return new CircuitRelayTransport(components, init)
  }
}
