import type { EventEmitter } from '@libp2p/interfaces/events'
import type { PeerMap } from '@libp2p/peer-collections'
import type { Limit } from './pb/index.js'
import type { Multiaddr } from '@multiformats/multiaddr'

export interface RelayReservation {
  expire: Date
  addr: Multiaddr
  limit?: Limit
}

export interface CircuitRelayServiceEvents {
  'relay:reservation': CustomEvent<RelayReservation>
  'relay:advert:success': CustomEvent<unknown>
  'relay:advert:error': CustomEvent<Error>
}

export interface CircuitRelayService extends EventEmitter<CircuitRelayServiceEvents> {
  reservations: PeerMap<RelayReservation>
}

export { circuitRelayServer } from './server/index.js'
export { circuitRelayTransport } from './transport/index.js'
