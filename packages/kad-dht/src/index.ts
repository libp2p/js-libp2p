/**
 * @packageDocumentation
 *
 * This module implements the [libp2p Kademlia spec](https://github.com/libp2p/specs/blob/master/kad-dht/README.md) in TypeScript.
 *
 * The Kademlia DHT allow for several operations such as finding peers, searching for providers of DHT records, etc.
 *
 * @example Using with libp2p
 *
 * ```TypeScript
 * import { kadDHT } from '@libp2p/kad-dht'
 * import { createLibp2p } from 'libp2p'
 * import { peerIdFromString } from '@libp2p/peer-id'
 *
 * const node = await createLibp2p({
 *   services: {
 *     dht: kadDHT({
 *       // DHT options
 *     })
 *   }
 * })
 *
 * const peerId = peerIdFromString('QmFoo')
 * const peerInfo = await node.peerRouting.findPeer(peerId)
 *
 * console.info(peerInfo) // peer id, multiaddrs
 * ```
 *
 * @example Connecting to the IPFS Amino DHT
 *
 * The [Amino DHT](https://blog.ipfs.tech/2023-09-amino-refactoring/) is a public-good DHT used by IPFS to fetch content, find peers, etc.
 *
 * If you are trying to access content on the public internet, this is the implementation you want.
 *
 * ```TypeScript
 * import { kadDHT, removePrivateAddressesMapper } from '@libp2p/kad-dht'
 * import { createLibp2p } from 'libp2p'
 * import { peerIdFromString } from '@libp2p/peer-id'
 *
 * const node = await createLibp2p({
 *   services: {
 *     aminoDHT: kadDHT({
 *       protocol: '/ipfs/kad/1.0.0',
 *       peerInfoMapper: removePrivateAddressesMapper
 *     })
 *   }
 * })
 *
 * const peerId = peerIdFromString('QmFoo')
 * const peerInfo = await node.peerRouting.findPeer(peerId)
 *
 * console.info(peerInfo) // peer id, multiaddrs
 * ```
 *
 * @example Connecting to a LAN-only DHT
 *
 * This DHT only works with privately dialable peers.
 *
 * This is for use when peers are on the local area network.
 *
 * ```TypeScript
 * import { kadDHT, removePublicAddressesMapper } from '@libp2p/kad-dht'
 * import { createLibp2p } from 'libp2p'
 * import { peerIdFromString } from '@libp2p/peer-id'
 *
 * const node = await createLibp2p({
 *   services: {
 *     lanDHT: kadDHT({
 *       protocol: '/ipfs/lan/kad/1.0.0',
 *       peerInfoMapper: removePublicAddressesMapper,
 *       clientMode: false
 *     })
 *   }
 * })
 *
 * const peerId = peerIdFromString('QmFoo')
 * const peerInfo = await node.peerRouting.findPeer(peerId)
 *
 * console.info(peerInfo) // peer id, multiaddrs
 * ```
 *
 * @example Connecting to both a LAN-only DHT and the IPFS Amino DHT
 *
 * When using multiple DHTs, you should specify distinct datastore, metrics and
 * log prefixes to ensure that data is kept separate for each instance.
 *
 * ```TypeScript
 * import { kadDHT, removePublicAddressesMapper, removePrivateAddressesMapper } from '@libp2p/kad-dht'
 * import { createLibp2p } from 'libp2p'
 * import { peerIdFromString } from '@libp2p/peer-id'
 *
 * const node = await createLibp2p({
 *   services: {
 *     lanDHT: kadDHT({
 *       protocol: '/ipfs/lan/kad/1.0.0',
 *       peerInfoMapper: removePublicAddressesMapper,
 *       clientMode: false,
 *       logPrefix: 'libp2p:dht-lan',
 *       datastorePrefix: '/dht-lan',
 *       metricsPrefix: 'libp2p_dht_lan'
 *     }),
 *     aminoDHT: kadDHT({
 *       protocol: '/ipfs/kad/1.0.0',
 *       peerInfoMapper: removePrivateAddressesMapper,
 *       logPrefix: 'libp2p:dht-amino',
 *       datastorePrefix: '/dht-amino',
 *       metricsPrefix: 'libp2p_dht_amino'
 *     })
 *   }
 * })
 *
 * const peerId = peerIdFromString('QmFoo')
 * const peerInfo = await node.peerRouting.findPeer(peerId)
 *
 * console.info(peerInfo) // peer id, multiaddrs
 * ```
 */

import { KadDHT as KadDHTClass } from './kad-dht.js'
import { MessageType } from './message/dht.js'
import { removePrivateAddressesMapper, removePublicAddressesMapper, passthroughMapper } from './utils.js'
import type { Libp2pEvents, ComponentLogger, TypedEventTarget, Metrics, PeerId, PeerInfo, PeerStore, RoutingOptions, PrivateKey } from '@libp2p/interface'
import type { AddressManager, ConnectionManager, Registrar } from '@libp2p/interface-internal'
import type { AdaptiveTimeoutInit } from '@libp2p/utils/src/adaptive-timeout.js'
import type { Datastore } from 'interface-datastore'
import type { CID } from 'multiformats/cid'
import type { ProgressEvent } from 'progress-events'

export { Libp2pRecord as Record } from '@libp2p/record'
export { removePrivateAddressesMapper, removePublicAddressesMapper, passthroughMapper }

/**
 * The types of events emitted during DHT queries
 */
export enum EventTypes {
  SEND_QUERY = 0,
  PEER_RESPONSE,
  FINAL_PEER,
  QUERY_ERROR,
  PROVIDER,
  VALUE,
  ADD_PEER,
  DIAL_PEER
}

/**
 * The types of messages sent to peers during DHT queries
 */
export { MessageType }

export type MessageName = keyof typeof MessageType

export interface DHTRecord {
  key: Uint8Array
  value: Uint8Array
  timeReceived?: Date
}

export type DHTProgressEvents =
  ProgressEvent<'kad-dht:query:send-query', SendQueryEvent> |
  ProgressEvent<'kad-dht:query:peer-response', PeerResponseEvent> |
  ProgressEvent<'kad-dht:query:final-peer', FinalPeerEvent> |
  ProgressEvent<'kad-dht:query:query-error', QueryErrorEvent> |
  ProgressEvent<'kad-dht:query:provider', ProviderEvent> |
  ProgressEvent<'kad-dht:query:value', ValueEvent> |
  ProgressEvent<'kad-dht:query:add-peer', AddPeerEvent> |
  ProgressEvent<'kad-dht:query:dial-peer', DialPeerEvent>

/**
 * Emitted when sending queries to remote peers
 */
export interface SendQueryEvent {
  to: PeerId
  type: EventTypes.SEND_QUERY
  name: 'SEND_QUERY'
  messageName: keyof typeof MessageType
  messageType: MessageType
}

/**
 * Emitted when query responses are received form remote peers.  Depending on the query
 * these events may be followed by a `FinalPeerEvent`, a `ValueEvent` or a `ProviderEvent`.
 */
export interface PeerResponseEvent {
  from: PeerId
  type: EventTypes.PEER_RESPONSE
  name: 'PEER_RESPONSE'
  messageName: keyof typeof MessageType
  messageType: MessageType
  closer: PeerInfo[]
  providers: PeerInfo[]
  record?: DHTRecord
}

/**
 * Emitted at the end of a `findPeer` query
 */
export interface FinalPeerEvent {
  from: PeerId
  peer: PeerInfo
  type: EventTypes.FINAL_PEER
  name: 'FINAL_PEER'
}

/**
 * Something went wrong with the query
 */
export interface QueryErrorEvent {
  from: PeerId
  type: EventTypes.QUERY_ERROR
  name: 'QUERY_ERROR'
  error: Error
}

/**
 * Emitted when providers are found
 */
export interface ProviderEvent {
  from: PeerId
  type: EventTypes.PROVIDER
  name: 'PROVIDER'
  providers: PeerInfo[]
}

/**
 * Emitted when values are found
 */
export interface ValueEvent {
  from: PeerId
  type: EventTypes.VALUE
  name: 'VALUE'
  value: Uint8Array
}

/**
 * Emitted when peers are added to a query
 */
export interface AddPeerEvent {
  type: EventTypes.ADD_PEER
  name: 'ADD_PEER'
  peer: PeerId
}

/**
 * Emitted when peers are dialled as part of a query
 */
export interface DialPeerEvent {
  peer: PeerId
  type: EventTypes.DIAL_PEER
  name: 'DIAL_PEER'
}

export type QueryEvent = SendQueryEvent | PeerResponseEvent | FinalPeerEvent | QueryErrorEvent | ProviderEvent | ValueEvent | AddPeerEvent | DialPeerEvent

export interface RoutingTable {
  size: number
}

export interface PeerInfoMapper {
  (peer: PeerInfo): PeerInfo
}

export interface KadDHT {
  /**
   * Get a value from the DHT, the final ValueEvent will be the best value
   */
  get(key: Uint8Array, options?: RoutingOptions): AsyncIterable<QueryEvent>

  /**
   * Find providers of a given CID
   */
  findProviders(key: CID, options?: RoutingOptions): AsyncIterable<QueryEvent>

  /**
   * Find a peer on the DHT
   */
  findPeer(id: PeerId, options?: RoutingOptions): AsyncIterable<QueryEvent>

  /**
   * Find the closest peers to the passed key
   */
  getClosestPeers(key: Uint8Array, options?: RoutingOptions): AsyncIterable<QueryEvent>

  /**
   * Store provider records for the passed CID on the DHT pointing to us
   */
  provide(key: CID, options?: RoutingOptions): AsyncIterable<QueryEvent>

  /**
   * Provider records must be re-published every 24 hours - pass a previously
   * provided CID here to not re-publish a record for it any more
   */
  cancelReprovide(key: CID): Promise<void>

  /**
   * Store the passed value under the passed key on the DHT
   */
  put(key: Uint8Array, value: Uint8Array, options?: RoutingOptions): AsyncIterable<QueryEvent>

  /**
   * Returns the mode this node is in
   */
  getMode(): 'client' | 'server'

  /**
   * If 'server' this node will respond to DHT queries, if 'client' this node
   * will not.
   */
  setMode(mode: 'client' | 'server'): Promise<void>

  /**
   * Force a routing table refresh
   */
  refreshRoutingTable(): Promise<void>
}

export interface SingleKadDHT extends KadDHT {
  routingTable: RoutingTable
}

/**
 * A selector function takes a DHT key and a list of records and returns the
 * index of the best record in the list
 */
export interface SelectFn { (key: Uint8Array, records: Uint8Array[]): number }

/**
 * A validator function takes a DHT key and the value of the record for that key
 * and throws if the record is invalid
 */
export interface ValidateFn { (key: Uint8Array, value: Uint8Array): Promise<void> }

/**
 * Selectors are a map of key prefixes to selector functions
 */
export type Selectors = Record<string, SelectFn>

/**
 * Validators are a map of key prefixes to validator functions
 */
export type Validators = Record<string, ValidateFn>

export interface ProvidersInit {
  /**
   * @default 256
   */
  cacheSize?: number
  /**
   * How often invalid records are cleaned in seconds
   *
   * @default 5_400
   */
  cleanupInterval?: number
  /**
   * How long is a provider valid for in seconds
   *
   * @default 86_400
   */
  provideValidity?: number
}

export interface ReProvideInit {
  /**
   * How many re-provide operations to run simultaneously
   *
   * @default 10
   */
  concurrency?: number

  /**
   * How long to let the re-provide queue grow
   *
   * @default 16_384
   */
  maxQueueSize?: number

  /**
   * How long before the record expiry to re-provide in ms
   *
   * @default 86_400_000 (24 hours)
   */
  threshold?: number

  /**
   * How often to check which records need re-providing in ms
   *
   * @default 3_600_000 (1 hour)
   */
  interval?: number

  /**
   * How long provider records are valid for in ms
   *
   * @default 172_800_000 (48 hours)
   */
  validity?: number
}

export interface KadDHTInit {
  /**
   * How many peers to store in each kBucket. Once there are more than this
   * number of peers for a given prefix in a kBucket, the node will start to
   * ping existing peers to see if they are still online - if they are offline
   * they will be evicted and the new peer added.
   *
   * @default 20
   */
  kBucketSize?: number

  /**
   * The threshold at which a kBucket will be split into two smaller kBuckets.
   *
   * KBuckets will not be split once the maximum trie depth is reached
   * (controlled by the `prefixLength` option) so one can replicate go-libp2p's
   * accelerated DHT client by (for example) setting `kBucketSize` to `Infinity`
   * and `kBucketSplitThreshold` to 20.
   *
   * @default kBucketSize
   */
  kBucketSplitThreshold?: number

  /**
   * How many bits of the KAD-ID of peers to use when creating the routing
   * table.
   *
   * The routing table is a binary trie with peers stored in the leaf nodes. The
   * larger this number gets, the taller the trie can grow and the more peers
   * can be stored.
   *
   * Storing more peers means fewer lookups (and network operations) are needed
   * to locate a certain peer, but also that more memory is consumed.
   *
   * @default 32
   */
  prefixLength?: number

  /**
   * If true, only ever be a DHT client. If false, be a DHT client until told
   * to be a DHT server via `setMode`.
   *
   * @default false
   */
  clientMode?: boolean

  /**
   * Record selectors
   */
  selectors?: Selectors

  /**
   * Record validators
   */
  validators?: Validators

  /**
   * How often to query our own PeerId in order to ensure we have a
   * good view on the KAD address space local to our PeerId
   */
  querySelfInterval?: number

  /**
   * During startup we run the self-query at a shorter interval to ensure
   * the containing node can respond to queries quickly. Set this interval
   * here in ms.
   *
   * @default 1000
   */
  initialQuerySelfInterval?: number

  /**
   * After startup by default all queries will be paused until the initial
   * self-query has run and there are some peers in the routing table.
   *
   * Pass true here to disable this behavior.
   *
   * @default false
   */
  allowQueryWithZeroPeers?: boolean

  /**
   * The network protocol to use
   *
   * @default "/ipfs/kad/1.0.0"
   */
  protocol?: string

  /**
   * The logging prefix to use
   *
   * @default "libp2p:kad-dht"
   */
  logPrefix?: string

  /**
   * The datastore prefix to use
   *
   * @default "/dht"
   */
  datastorePrefix?: string

  /**
   * The metrics prefix to use
   *
   * @default "libp2p_kad_dht"
   */
  metricsPrefix?: string

  /**
   * Settings for how long to wait in ms when pinging DHT peers to decide if
   * they should be evicted from the routing table or not.
   */
  pingOldContactTimeout?: Omit<AdaptiveTimeoutInit, 'metricsName' | 'metrics'>

  /**
   * How many peers to ping in parallel when deciding if they should
   * be evicted from the routing table or not
   *
   * @default 10
   */
  pingOldContactConcurrency?: number

  /**
   * How long the queue to ping peers is allowed to grow
   *
   * @default 100
   */
  pingOldContactMaxQueueSize?: number

  /**
   * Settings for how long to wait in ms when pinging DHT peers to decide if
   * they should be added to the routing table or not.
   */
  pingNewContactTimeout?: Omit<AdaptiveTimeoutInit, 'metricsName' | 'metrics'>

  /**
   * How many peers to ping in parallel when deciding if they should be added to
   * the routing table or not
   *
   * @default 10
   */
  pingNewContactConcurrency?: number

  /**
   * How long the queue to ping peers is allowed to grow
   *
   * @default 100
   */
  pingNewContactMaxQueueSize?: number

  /**
   * How many parallel incoming streams to allow on the DHT protocol per
   * connection
   *
   * @default 32
   */
  maxInboundStreams?: number

  /**
   * How many parallel outgoing streams to allow on the DHT protocol per
   * connection
   *
   * @default 64
   */
  maxOutboundStreams?: number

  /**
   * Initialization options for the Providers component
   */
  providers?: ProvidersInit

  /**
   * Initialization options for the Reprovider component
   */
  reprovide?: ReProvideInit

  /**
   * For every incoming and outgoing PeerInfo, override address configuration
   * with this filter.
   */
  peerInfoMapper?(peer: PeerInfo): PeerInfo

  /**
   * Dynamic network timeout settings for sending messages to peers
   */
  networkDialTimeout?: Omit<AdaptiveTimeoutInit, 'metricsName' | 'metrics'>
}

export interface KadDHTComponents {
  peerId: PeerId
  privateKey: PrivateKey
  registrar: Registrar
  addressManager: AddressManager
  peerStore: PeerStore
  metrics?: Metrics
  connectionManager: ConnectionManager
  datastore: Datastore
  events: TypedEventTarget<Libp2pEvents>
  logger: ComponentLogger
}

/**
 * Creates a custom DHT implementation, please ensure you pass a `protocol`
 * string as an option.
 */
export function kadDHT (init: KadDHTInit = {}): (components: KadDHTComponents) => KadDHT {
  return (components: KadDHTComponents) => new KadDHTClass(components, init)
}
