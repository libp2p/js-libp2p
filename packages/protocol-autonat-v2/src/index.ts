/**
 * @packageDocumentation
 *
 * The AutoNATv2 service implements the [AutoNAT v2 protocol](https://github.com/libp2p/specs/blob/master/autonat/autonat-v2.md)
 * to confirm whether addresses the node is listening on are dialable by remote
 * peers.
 *
 * It does not implement NAT hole punching.
 *
 * @example
 *
 * ```typescript
 * import { createLibp2p } from 'libp2p'
 * import { autoNATv2 } from '@libp2p/autonat-v2'
 *
 * const node = await createLibp2p({
 *   // ...other options
 *   services: {
 *     autoNAT: autoNATv2()
 *   }
 * })
 * ```
 */

import { AutoNATv2Service } from './autonat.ts'
import type { ComponentLogger, Metrics, PeerStore } from '@libp2p/interface'
import type { AddressManager, ConnectionManager, RandomWalk, Registrar } from '@libp2p/interface-internal'

export interface AutoNATv2ServiceInit {
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

  /**
   * When asked to send data as part of the amplification attack protection,
   * refuse to send more than this amount of data.
   *
   * @default 200_000n
   */
  maxDialDataBytes?: bigint

  /**
   * When asked to send data as part of the amplification attack protection,
   * send data in with this size chunks
   *
   * @default 4096
   */
  dialDataChunkSize?: number
}

export interface AutoNATv2Components {
  registrar: Registrar
  addressManager: AddressManager
  connectionManager: ConnectionManager
  logger: ComponentLogger
  randomWalk: RandomWalk
  peerStore: PeerStore
  metrics?: Metrics
}

export function autoNATv2 (init: AutoNATv2ServiceInit = {}): (components: AutoNATv2Components) => unknown {
  return (components) => {
    return new AutoNATv2Service(components, init)
  }
}
