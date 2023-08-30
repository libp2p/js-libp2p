/**
 * @packageDocumentation
 *
 * Direct Connection Upgrade through Relay (DCUtR) is a protocol that allows two
 * nodes to connect to each other who would otherwise be prevented doing so due
 * to being behind NATed connections or firewalls.
 *
 * The protocol involves making a relayed connection between the two peers and
 * using the relay to synchronise connection timings so that they dial each other
 * at precisely the same moment.
 *
 * @example
 *
 * ```ts
 * import { createLibp2p } from 'libp2p'
 * import { circuitRelayTransport } from 'libp2p/circuit-relay'
 * import { tcp } from '@libp2p/tcp'
 * import { identifyService } from 'libp2p/identify'
 * import { dCUtRService } from 'libp2p/dcutr'
 *
 * const node = await createLibp2p({
 *   transports: [
 *     circuitRelayTransport(),
 *     tcp()
 *   ],
 *   services: {
 *     identify: identifyService(),
 *     dcutr: dcutrService()
 *   }
 * })
 *
 * // QmTarget is a peer that is behind a NAT, supports TCP and has a relay
 * // reservation
 * await node.dial('/ip4/.../p2p/QmRelay/p2p-circuit/p2p/QmTarget')
 *
 * // after a while the connection should automatically get upgraded to a
 * // direct connection (e.g. non-transient)
 * while (true) {
 *   const connections = node.getConnections()
 *
 *   if (connections.find(conn => conn.transient === false)) {
 *     console.info('have direct connection')
 *     break
 *   } else {
 *     console.info('have relayed connection')
 *
 *     // wait a few seconds to see if it's succeeded yet
 *     await new Promise((resolve) => {
 *       setTimeout(() => resolve(), 5000)
 *     })
 *   }
 * }
 * ```
 */

import { DefaultDCUtRService } from './dcutr.js'
import type { PeerStore } from '@libp2p/interface/peer-store'
import type { AddressManager } from '@libp2p/interface-internal/address-manager'
import type { ConnectionManager } from '@libp2p/interface-internal/connection-manager'
import type { Registrar } from '@libp2p/interface-internal/registrar'
import type { TransportManager } from '@libp2p/interface-internal/transport-manager'

export interface DCUtRServiceInit {
  /**
   * How long we should wait for the connection upgrade to complete (default: 5s)
   */
  timeout?: number

  /**
   * How many times to retry the connection upgrade (default: 3)
   */
  retries?: number

  /**
   * How many simultaneous inbound DCUtR protocol streams to allow on each
   * connection (default: 1)
   */
  maxInboundStreams?: number

  /**
   * How many simultaneous outbound DCUtR protocol streams to allow on each
   * connection (default: 1)
   */
  maxOutboundStreams?: number
}

export interface DCUtRServiceComponents {
  peerStore: PeerStore
  connectionManager: ConnectionManager
  registrar: Registrar
  addressManager: AddressManager
  transportManager: TransportManager
}

/**
 * The DCUtR protocol
 */
export const multicodec = '/libp2p/dcutr'

export function dcutrService (init: DCUtRServiceInit = {}): (components: DCUtRServiceComponents) => unknown {
  return (components) => new DefaultDCUtRService(components, init)
}
