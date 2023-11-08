/**
 * @packageDocumentation
 *
 * The ping service implements the [libp2p ping spec](https://github.com/libp2p/specs/blob/master/ping/ping.md) allowing you to make a latency measurement to a remote peer.
 *
 * @example
 *
 * ```typescript
 * import { createLibp2p } from 'libp2p'
 * import { ping } from '@libp2p/ping'
 * import { multiaddr } from '@multiformats/multiaddr'
 *
 * const node = await createLibp2p({
 *   services: {
 *     ping: ping()
 *   }
 * })
 *
 * const rtt = await node.services.ping.ping(multiaddr('/ip4/...'))
 *
 * console.info(rtt)
 * ```
 */

import { PingService as PingServiceClass } from './ping.js'
import type { AbortOptions, ComponentLogger } from '@libp2p/interface'
import type { PeerId } from '@libp2p/interface/peer-id'
import type { ConnectionManager } from '@libp2p/interface-internal/connection-manager'
import type { Registrar } from '@libp2p/interface-internal/registrar'
import type { Multiaddr } from '@multiformats/multiaddr'

export interface PingService {
  ping(peer: PeerId | Multiaddr | Multiaddr[], options?: AbortOptions): Promise<number>
}

export interface PingServiceInit {
  protocolPrefix?: string
  maxInboundStreams?: number
  maxOutboundStreams?: number
  runOnTransientConnection?: boolean

  /**
   * How long we should wait for a ping response
   */
  timeout?: number
}

export interface PingServiceComponents {
  registrar: Registrar
  connectionManager: ConnectionManager
  logger: ComponentLogger
}

export function ping (init: PingServiceInit = {}): (components: PingServiceComponents) => PingService {
  return (components) => new PingServiceClass(components, init)
}
