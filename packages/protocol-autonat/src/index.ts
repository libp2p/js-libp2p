/**
 * @packageDocumentation
 *
 * The AutoNAT service implements the [AutoNAT protocol](https://docs.libp2p.io/concepts/nat/autonat/)
 * to confirm whether addresses the node is listening on are dialable by remote
 * peers.
 *
 * It does not implement NAT hole punching.
 *
 * > [!IMPORTANT]
 * > [AutoNat v2](https://www.npmjs.com/package/@libp2p/autonat-v2) is now
 * > available and should be preferred to this module.
 *
 * @example
 *
 * ```typescript
 * import { createLibp2p } from 'libp2p'
 * import { autoNAT } from '@libp2p/autonat'
 *
 * const node = await createLibp2p({
 *   // ...other options
 *   services: {
 *     autoNAT: autoNAT()
 *   }
 * })
 * ```
 */

import { AutoNATService } from './autonat.js'
import type { ComponentLogger, Libp2pEvents, Metrics, PeerId, PeerStore } from '@libp2p/interface'
import type { AddressManager, ConnectionManager, RandomWalk, Registrar, TransportManager } from '@libp2p/interface-internal'
import type { TypedEventTarget } from 'main-event'

export interface AutoNATServiceInit {
  /**
   * Allows overriding the protocol prefix used
   */
  protocolPrefix?: string

  /**
   * How long we should wait for a remote peer to verify our external address
   */
  timeout?: number

  /**
   * How long to wait after startup before trying to verify our external address
   */
  startupDelay?: number

  /**
   * Verify our external addresses this often
   */
  refreshInterval?: number

  /**
   * How many parallel inbound autoNAT streams we allow per-connection
   */
  maxInboundStreams?: number

  /**
   * How many parallel outbound autoNAT streams we allow per-connection
   */
  maxOutboundStreams?: number

  /**
   * If the number of currently open connections is higher than this value as
   * a percentage of the maximum number of allowed connections, automatically
   * reverify previously verified addresses since auto nat peers may find it
   * hard to dial and will report that the address is not dialable leading this
   * node to delist it.
   *
   * @default 80
   */
  connectionThreshold?: number

  /**
   * How large incoming autonat messages are allowed to be in bytes. If messages
   * larger than this are received the stream will be reset.
   *
   * @default 8192
   */
  maxMessageSize?: number
}

export interface AutoNATComponents {
  registrar: Registrar
  addressManager: AddressManager
  transportManager: TransportManager
  peerId: PeerId
  connectionManager: ConnectionManager
  logger: ComponentLogger
  randomWalk: RandomWalk
  events: TypedEventTarget<Libp2pEvents>
  peerStore: PeerStore
  metrics?: Metrics
}

export function autoNAT (init: AutoNATServiceInit = {}): (components: AutoNATComponents) => unknown {
  return (components) => {
    return new AutoNATService(components, init)
  }
}
