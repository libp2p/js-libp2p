/**
 * @packageDocumentation
 *
 * Direct Connection Upgrade through Relay (DCUtR) is a protocol that allows two
 * nodes to connect to each other who would otherwise be prevented doing so due
 * to being behind NATed connections or firewalls.
 *
 * The protocol involves making a relayed connection between the two peers and
 * using the relay to synchronize connection timings so that they dial each other
 * at precisely the same moment.
 *
 * @example
 *
 * ```TypeScript
 * import { createLibp2p } from 'libp2p'
 * import { circuitRelayTransport } from '@libp2p/circuit-relay-v2'
 * import { tcp } from '@libp2p/tcp'
 * import { identify } from '@libp2p/identify'
 * import { dcutr } from '@libp2p/dcutr'
 * import { multiaddr } from '@multiformats/multiaddr'
 *
 * const node = await createLibp2p({
 *   transports: [
 *     circuitRelayTransport(),
 *     tcp()
 *   ],
 *   services: {
 *     identify: identify(),
 *     dcutr: dcutr()
 *   }
 * })
 *
 * // QmTarget is a peer that is behind a NAT, supports TCP and has a relay
 * // reservation
 * const ma = multiaddr('/ip4/.../p2p/QmRelay/p2p-circuit/p2p/QmTarget')
 * await node.dial(ma)
 *
 * // after a while the connection should automatically get upgraded to a
 * // direct connection (e.g. non-limited)
 * while (true) {
 *   const connections = node.getConnections()
 *
 *   if (connections.find(conn => conn.limits == null)) {
 *     console.info('have direct connection')
 *     break
 *   } else {
 *     console.info('have relayed connection')
 *
 *     // wait a few seconds to see if it's succeeded yet
 *     await new Promise<void>((resolve) => {
 *       setTimeout(() => resolve(), 5000)
 *     })
 *   }
 * }
 * ```
 */

import { DefaultDCUtRService } from './dcutr.js'
import type { ComponentLogger, PeerStore } from '@libp2p/interface'
import type { AddressManager, ConnectionManager, Registrar, TransportManager } from '@libp2p/interface-internal'

export interface DCUtRServiceInit {
  /**
   * How long we should wait for the connection upgrade to complete
   *
   * @default 5000
   */
  timeout?: number

  /**
   * How many times to retry the connection upgrade
   *
   * @default 3
   */
  retries?: number

  /**
   * How many simultaneous inbound DCUtR protocol streams to allow on each
   * connection
   *
   * @default 1
   */
  maxInboundStreams?: number

  /**
   * How many simultaneous outbound DCUtR protocol streams to allow on each
   * connection
   *
   * @default 1
   */
  maxOutboundStreams?: number
}

export interface DCUtRServiceComponents {
  peerStore: PeerStore
  connectionManager: ConnectionManager
  registrar: Registrar
  addressManager: AddressManager
  transportManager: TransportManager
  logger: ComponentLogger
}

/**
 * The DCUtR protocol
 */
export const multicodec = '/libp2p/dcutr'

export function dcutr (init: DCUtRServiceInit = {}): (components: DCUtRServiceComponents) => unknown {
  return (components) => new DefaultDCUtRService(components, init)
}
