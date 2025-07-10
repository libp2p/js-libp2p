/**
 * @packageDocumentation
 *
 * Use the `identify` function to add support for the [Identify protocol](https://github.com/libp2p/specs/blob/master/identify/README.md) to libp2p.
 *
 * This protocol allows network peers to discover the multiaddrs the current node listens on, and the protocols it supports.
 *
 * A second function, `identifyPush` is also exported to add support for [identify/push](https://github.com/libp2p/specs/blob/master/identify/README.md#identifypush).
 *
 * This protocol will send updates to all connected peers when the multiaddrs or protocols of the current node change.
 *
 * > [!TIP]
 * > For maximum network compatibility you should configure both protocols
 *
 * @example Enabling identify
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
 *
 * @example Enabling identify push
 *
 * ```typescript
 * import { createLibp2p } from 'libp2p'
 * import { identifyPush } from '@libp2p/identify'
 *
 * const node = await createLibp2p({
 *   // ...other options
 *   services: {
 *     identifyPush: identifyPush()
 *   }
 * })
 * ```
 */

import { IdentifyPush as IdentifyPushClass } from './identify-push.js'
import { Identify as IdentifyClass } from './identify.js'
import type { AbortOptions, IdentifyResult, Libp2pEvents, ComponentLogger, NodeInfo, PeerId, PeerStore, Connection, PrivateKey } from '@libp2p/interface'
import type { AddressManager, ConnectionManager, Registrar } from '@libp2p/interface-internal'
import type { TypedEventTarget } from 'main-event'

export interface IdentifyInit {
  /**
   * The prefix to use for the protocol
   *
   * @default 'ipfs'
   */
  protocolPrefix?: string

  /**
   * What details we should send as part of an identify message
   *
   * @deprecated Use `nodeInfo.userAgent` in the main libp2p config instead
   */
  agentVersion?: string

  /**
   * How long we should wait for a remote peer to send their identify response
   *
   * @default 5000
   */
  timeout?: number

  /**
   * Identify responses larger than this in bytes will be rejected
   *
   * @default 8192
   */
  maxMessageSize?: number

  /**
   * The maximum number of inbound streams that may be open on a single
   * connection for this protocol
   *
   * @default 1
   */
  maxInboundStreams?: number

  /**
   * The maximum number of outbound streams that may be open on a single
   * connection for this protocol
   *
   * @default 1
   */
  maxOutboundStreams?: number

  /**
   * The maximum number of observed addresses to send in an Identify message
   */
  maxObservedAddresses?: number

  /**
   * Whether to run on connections with data or duration limits
   *
   * @default true
   */
  runOnLimitedConnection?: boolean

  /**
   * Whether to automatically run identify on newly opened connections
   *
   * @default true
   */
  runOnConnectionOpen?: boolean
}

export interface IdentifyPushInit extends Omit<IdentifyInit, 'runOnConnectionOpen'> {
  /**
   * Whether to automatically dial identify-push on self updates
   *
   * @default true
   */
  runOnSelfUpdate?: boolean

  /**
   * Push to this many connections in parallel
   *
   * @default 32
   */
  concurrency?: number

  /**
   * To prevent rapid flurries of network activity when addresses/protocols
   * change rapidly in succession, debounce the sending of push message by this
   * amount in ms
   *
   * @default 1_000
   */
  debounce?: number
}

export interface IdentifyComponents {
  peerId: PeerId
  privateKey: PrivateKey
  peerStore: PeerStore
  registrar: Registrar
  addressManager: AddressManager
  events: TypedEventTarget<Libp2pEvents>
  logger: ComponentLogger
  nodeInfo: NodeInfo
}

export interface IdentifyPushComponents extends IdentifyComponents {
  connectionManager: ConnectionManager
}

export interface Identify {
  /**
   * Please use with caution.
   *
   * Due to the default limits on inbound/outbound streams for this protocol,
   * invoking this method when runOnConnectionOpen is true can lead to
   * unpredictable results as streams may be closed by the local or the remote
   * node.
   *
   * If you find yourself needing to call this method to discover other peers
   * that support your protocol, you may be better off configuring a topology to
   * be notified instead.
   *
   * Alternatively the libp2p node itself will emit `peer:identify` events after
   * identify has taken place which can be used to passively detect new peers.
   */
  identify(connection: Connection, options?: AbortOptions): Promise<IdentifyResult>
}

export interface IdentifyPush {
  push(): Promise<void>
}

export function identify (init: IdentifyInit = {}): (components: IdentifyComponents) => Identify {
  return (components) => new IdentifyClass(components, init)
}

export function identifyPush (init: IdentifyPushInit = {}): (components: IdentifyPushComponents) => IdentifyPush {
  return (components) => new IdentifyPushClass(components, init)
}
