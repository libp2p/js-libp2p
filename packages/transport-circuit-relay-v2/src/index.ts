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
import type { Limit } from './pb/index.js'
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

export { circuitRelayServer } from './server/index.js'
export type { CircuitRelayServerInit, CircuitRelayServerComponents } from './server/index.js'
export type { ReservationStoreInit as ServerReservationStoreInit } from './server/reservation-store.js'
export { circuitRelayTransport } from './transport/index.js'
export type { RelayDiscoveryComponents } from './transport/discovery.js'
export type { ReservationStoreInit as TransportReservationStoreInit } from './transport/reservation-store.js'
export type { CircuitRelayTransportInit, CircuitRelayTransportComponents } from './transport/index.js'

export {
  RELAY_V2_HOP_CODEC,
  RELAY_V2_STOP_CODEC
} from './constants.js'
