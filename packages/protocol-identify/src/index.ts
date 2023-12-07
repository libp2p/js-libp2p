/**
 * @packageDocumentation
 *
 * Use the `identify` function to add support for the [Identify protocol](https://github.com/libp2p/specs/blob/master/identify/README.md) to libp2p.
 *
 * @example
 *
 * ```typescript
 * import { createLibp2p } from 'libp2p'
 * import { identify } from '@libp2p/identify'
 *
 * const node = await createLibp2p({
 *   // ...other options
 *   services: {
 *     identify: identify()
 *   }
 * })
 * ```
 */

import {
  MULTICODEC_IDENTIFY,
  MULTICODEC_IDENTIFY_PUSH
} from './consts.js'
import { Identify as IdentifyClass } from './identify.js'
import type { AbortOptions, IdentifyResult, Libp2pEvents, ComponentLogger, NodeInfo, TypedEventTarget, PeerId, PeerStore, Connection } from '@libp2p/interface'
import type { AddressManager, ConnectionManager, Registrar } from '@libp2p/interface-internal'

export interface IdentifyInit {
  /**
   * The prefix to use for the protocol (default: 'ipfs')
   */
  protocolPrefix?: string

  /**
   * What details we should send as part of an identify message
   */
  agentVersion?: string

  /**
   * How long we should wait for a remote peer to send their identify response
   */
  timeout?: number

  /**
   * Identify responses larger than this in bytes will be rejected (default: 8192)
   */
  maxIdentifyMessageSize?: number

  maxInboundStreams?: number
  maxOutboundStreams?: number

  maxPushIncomingStreams?: number
  maxPushOutgoingStreams?: number
  maxObservedAddresses?: number

  /**
   * Whether to automatically dial identify on newly opened connections (default: true)
   */
  runOnConnectionOpen?: boolean

  /**
   * Whether to run on connections with data or duration limits (default: true)
   */
  runOnTransientConnection?: boolean
}

export interface IdentifyComponents {
  peerId: PeerId
  peerStore: PeerStore
  connectionManager: ConnectionManager
  registrar: Registrar
  addressManager: AddressManager
  events: TypedEventTarget<Libp2pEvents>
  logger: ComponentLogger
  nodeInfo: NodeInfo
}

/**
 * The protocols the Identify service supports
 */
export const multicodecs = {
  IDENTIFY: MULTICODEC_IDENTIFY,
  IDENTIFY_PUSH: MULTICODEC_IDENTIFY_PUSH
}

export interface Identify {
  /**
   * due to the default limits on inbound/outbound streams for this protocol,
   * invoking this method when runOnConnectionOpen is true can lead to unpredictable results
   * as streams may be closed by the local or the remote node.
   * Please use with caution. If you find yourself needing to call this method to discover other peers that support your protocol,
   * you may be better off configuring a topology to be notified instead.
   */
  identify(connection: Connection, options?: AbortOptions): Promise<IdentifyResult>

  push(): Promise<void>
}

export function identify (init: IdentifyInit = {}): (components: IdentifyComponents) => Identify {
  return (components) => new IdentifyClass(components, init)
}
