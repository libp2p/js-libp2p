/**
 * @packageDocumentation
 *
 * The `circuitRelayTransport` allows libp2p to dial and listen on [Circuit Relay](https://docs.libp2p.io/concepts/nat/circuit-relay/)
 * addresses.
 *
 * @example Use as a transport
 *
 * Configuring a transport will let you dial other circuit relay addresses.
 *
 * ```typescript
 * import { createLibp2p } from 'libp2p'
 * import { circuitRelayTransport } from '@libp2p/circuit-relay-v2'
 *
 * const node = await createLibp2p({
 *   transports: [
 *     circuitRelayTransport()
 *   ]
 * })
 * ```
 *
 * The `circuitRelayServer` function allows libp2p to function as a [Circuit Relay](https://docs.libp2p.io/concepts/nat/circuit-relay/)
 * server.  This will not work in browsers.
 *
 * @example Use as a server
 *
 * Configuring a server will let you function as a network relay for other
 * nodes.
 *
 * ```typescript
 * import { createLibp2p } from 'libp2p'
 * import { circuitRelayServer } from '@libp2p/circuit-relay-v2'
 *
 * const node = await createLibp2p({
 *   services: {
 *     circuitRelay: circuitRelayServer()
 *   }
 * })
 * ```
 */

import { TypedEventEmitter } from 'main-event'
import { CircuitRelayServer } from './server/index.js'
import { CircuitRelayTransport } from './transport/index.ts'
import type { Limit } from './pb/index.js'
import type { ComponentLogger, ConnectionGater, Libp2pEvents, Metrics, PeerId, PeerStore, PrivateKey, TopologyFilter, Transport, TypedEventTarget, Upgrader } from '@libp2p/interface'
import type { AddressManager, ConnectionManager, RandomWalk, Registrar, TransportManager } from '@libp2p/interface-internal'
import type { PeerMap } from '@libp2p/peer-collections'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { RetimeableAbortSignal } from 'retimeable-signal'

export type { Limit }

export interface RelayReservation {
  /**
   * When this reservation expires
   */
  expiry: Date

  /**
   * The address of the relay client
   */
  addr: Multiaddr

  /**
   * How much data can be transferred over each relayed connection and for how
   * long before the underlying stream is reset
   */
  limit?: Limit

  /**
   * This signal will fire it's "abort" event when the reservation expires
   */
  signal: RetimeableAbortSignal
}

export interface CircuitRelayServiceEvents {
  'relay:reservation': CustomEvent<RelayReservation>
  'relay:advert:success': CustomEvent<unknown>
  'relay:advert:error': CustomEvent<Error>
}

export interface CircuitRelayService extends TypedEventEmitter<CircuitRelayServiceEvents> {
  reservations: PeerMap<RelayReservation>
}

export {
  RELAY_V2_HOP_CODEC,
  RELAY_V2_STOP_CODEC
} from './constants.js'

export interface ServerReservationStoreInit {
  /**
   * maximum number of reservations allowed
   *
   * @default 15
   */
  maxReservations?: number

  /**
   * interval after which stale reservations are cleared
   *
   * @default 300000
   */
  reservationClearInterval?: number

  /**
   * apply default relay limits to a new reservation
   *
   * @default true
   */
  applyDefaultLimit?: boolean

  /**
   * reservation ttl
   *
   * @default 7200000
   */
  reservationTtl?: number

  /**
   * The maximum time a relayed connection can be open for
   */
  defaultDurationLimit?: number

  /**
   * The maximum amount of data allowed to be transferred over a relayed connection
   */
  defaultDataLimit?: bigint
}

export interface CircuitRelayServerComponents {
  registrar: Registrar
  peerStore: PeerStore
  addressManager: AddressManager
  peerId: PeerId
  privateKey: PrivateKey
  connectionManager: ConnectionManager
  connectionGater: ConnectionGater
  logger: ComponentLogger
  metrics?: Metrics
}

export interface CircuitRelayServerInit {
  /**
   * Incoming hop requests must complete within this time in ms otherwise
   * the stream will be reset
   *
   * @default 30000
   */
  hopTimeout?: number

  /**
   * Configuration of reservations
   */
  reservations?: ServerReservationStoreInit

  /**
   * The maximum number of simultaneous HOP inbound streams that can be open at once
   */
  maxInboundHopStreams?: number

  /**
   * The maximum number of simultaneous HOP outbound streams that can be open at once
   */
  maxOutboundHopStreams?: number

  /**
   * The maximum number of simultaneous STOP outbound streams that can be open at
   * once.
   *
   * @default 300
   */
  maxOutboundStopStreams?: number
}

export function circuitRelayServer (init: CircuitRelayServerInit = {}): (components: CircuitRelayServerComponents) => CircuitRelayService {
  return (components) => {
    return new CircuitRelayServer(components, init)
  }
}

export interface RelayDiscoveryEvents {
  'relay:discover': CustomEvent<PeerId>
}

export interface TransportReservationStoreComponents {
  peerId: PeerId
  connectionManager: ConnectionManager
  peerStore: PeerStore
  events: TypedEventTarget<Libp2pEvents>
  logger: ComponentLogger
  metrics?: Metrics
}

export interface TransportReservationStoreInit {
  /**
   * Multiple relays may be discovered simultaneously - to prevent listening
   * on too many relays, this value controls how many to attempt to reserve a
   * slot on at once. If set to more than one, we may end up listening on
   * more relays than the `maxReservations` value, but on networks with poor
   * connectivity the user may wish to attempt to reserve on multiple relays
   * simultaneously.
   *
   * @default 1
   */
  reservationConcurrency?: number

  /**
   * Limit the number of potential relays we will dial
   *
   * @default 100
   */
  maxReservationQueueLength?: number

  /**
   * When creating a reservation it must complete within this number of ms
   *
   * @default 5000
   */
  reservationCompletionTimeout?: number
}

export interface RelayDiscoveryComponents {
  peerStore: PeerStore
  connectionManager: ConnectionManager
  transportManager: TransportManager
  registrar: Registrar
  logger: ComponentLogger
  randomWalk: RandomWalk
  events: TypedEventTarget<Libp2pEvents>
}

export interface RelayDiscoveryInit {
  filter?: TopologyFilter
}

export interface CircuitRelayTransportComponents extends RelayDiscoveryComponents {
  peerId: PeerId
  upgrader: Upgrader
  addressManager: AddressManager
  connectionGater: ConnectionGater
}

/**
 * RelayConfig configures the circuit v2 relay transport.
 */
export interface CircuitRelayTransportInit extends TransportReservationStoreInit {
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
