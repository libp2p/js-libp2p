/**
 * @packageDocumentation
 *
 * Use the `autoNATService` function to add support for the [AutoNAT protocol](https://docs.libp2p.io/concepts/nat/autonat/)
 * to libp2p.
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
import type { ComponentLogger } from '@libp2p/interface'
import type { PeerId } from '@libp2p/interface/peer-id'
import type { PeerRouting } from '@libp2p/interface/peer-routing'
import type { AddressManager } from '@libp2p/interface-internal/address-manager'
import type { ConnectionManager } from '@libp2p/interface-internal/connection-manager'
import type { Registrar } from '@libp2p/interface-internal/registrar'
import type { TransportManager } from '@libp2p/interface-internal/transport-manager'

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
}

export interface AutoNATComponents {
  registrar: Registrar
  addressManager: AddressManager
  transportManager: TransportManager
  peerId: PeerId
  connectionManager: ConnectionManager
  peerRouting: PeerRouting
  logger: ComponentLogger
}

export function autoNAT (init: AutoNATServiceInit = {}): (components: AutoNATComponents) => unknown {
  return (components) => {
    return new AutoNATService(components, init)
  }
}
