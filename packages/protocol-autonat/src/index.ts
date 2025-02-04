/**
 * @packageDocumentation
 *
 * The AutoNAT service uses the [AutoNAT protocol](https://docs.libp2p.io/concepts/nat/autonat/).
 * The service confirms addresses are dialable by remote peers, and updates the list it advertises.
 *
 * The service dials randomly selected peers with a request to verify it's external addresses.
 * The request includes a list of public multiaddrs (addressManager.getObservedAddrs()).
 * The remote peers dial that list and respond with the results.
 *
 * The AutoNAT service uses those responses to either:
 * - addressManager.confirmObservedAddr(addr)
 * - addressManager.removeObservedAddr(addr)
 *
 * The result list of candidates and confirmed addresses can be found
 * at addressManager.getObservedAddrs()
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
import type { ComponentLogger, Libp2pEvents, PeerId, PeerStore, TypedEventTarget } from '@libp2p/interface'
import type { AddressManager, ConnectionManager, RandomWalk, Registrar, TransportManager } from '@libp2p/interface-internal'

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
}

export function autoNAT (init: AutoNATServiceInit = {}): (components: AutoNATComponents) => unknown {
  return (components) => {
    return new AutoNATService(components, init)
  }
}
