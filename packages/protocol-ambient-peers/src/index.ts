/**
 * @packageDocumentation
 *
 * Use the `ambientPeers` function to add support for the [Ambient Peer Discovery protocol](https://github.com/libp2p/specs/blob/55bbfdda444e35b3ff89e0090a42a4f6d23d2826/ambient-peer/README.md) to libp2p.
 *
 * @example
 *
 * ```typescript
 * import { createLibp2p } from 'libp2p'
 * import { identify } from '@libp2p/ambient-peer'
 *
 * const node = await createLibp2p({
 *   // ...other options
 *   services: {
 *     identify: identify()
 *   }
 * })
 * ```
 */

import { AmbientPeers as AmbientPeersClass } from './ambient-peers.js'
import type { AbortOptions, Libp2pEvents, ComponentLogger, NodeInfo } from '@libp2p/interface'
import type { TypedEventTarget } from '@libp2p/interface/events'
import type { PeerStore } from '@libp2p/interface/peer-store'
import type { Connection } from '@libp2p/interface/src/connection/index.js'
import type { AddressManager } from '@libp2p/interface-internal/address-manager'
import type { ConnectionManager } from '@libp2p/interface-internal/connection-manager'
import type { Registrar } from '@libp2p/interface-internal/registrar'
import type { Multiaddr } from '@multiformats/multiaddr'

export interface AmbientPeersInit {
  /**
   * The prefix to use for the protocol (default: 'libp2p')
   */
  protocolPrefix?: string
  /**
   * How long we should wait for the response before timing out
   */
  timeout?: number

  maxInboundStreams?: number
  maxOutboundStreams?: number

  /**
   * Whether to automatically try ambient peer discovery on newly opened connections (default: true)
   */
  runOnConnectionOpen?: boolean

  /**
   * Whether to run on connections with data or duration limits (default: true)
   */
  runOnTransientConnection?: boolean
}

export interface AmbientPeers {
  getPeers(connection: Connection, options?: AbortOptions): Promise<Multiaddr[]>
}

export interface AmbientPeersComponents {
  peerId: PeerId
  peerStore: PeerStore
  connectionManager: ConnectionManager
  registrar: Registrar
  logger: ComponentLogger
  addressManager: AddressManager
  events: TypedEventTarget<Libp2pEvents>
}

// factory which returns a partial function for easy init in libp2p constructor
export function ambientPeers (
  init: AmbientPeersInit = {}
): (components: AmbientPeersComponents) => AmbientPeers {
  return (components) => new AmbientPeersClass(components, init)
}
