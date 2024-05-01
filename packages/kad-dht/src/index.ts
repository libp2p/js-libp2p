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
 */

import { KadDHT as KadDHTClass } from './kad-dht.js'
import { MessageType } from './message/dht.js'
import { removePrivateAddressesMapper, removePublicAddressesMapper, passthroughMapper } from './utils.js'
import type { ProvidersInit } from './providers.js'
import type { Libp2pEvents, ComponentLogger, TypedEventTarget, Metrics, PeerId, PeerInfo, PeerStore, RoutingOptions } from '@libp2p/interface'
import type { AddressManager, ConnectionManager, Registrar } from '@libp2p/interface-internal'
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

export interface KadDHTInit {
  /**
   * How many peers to store in each kBucket
   *
   * @default 20
   */
  kBucketSize?: number

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
   * Pass true here to disable this behaviour.
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
   * How long to wait in ms when pinging DHT peers to decide if they
   * should be evicted from the routing table or not.
   *
   * @default 10000
   */
  pingTimeout?: number

  /**
   * How many peers to ping in parallel when deciding if they should
   * be evicted from the routing table or not
   *
   * @default 10
   */
  pingConcurrency?: number

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
   * For every incoming and outgoing PeerInfo, override address configuration
   * with this filter.
   */
  peerInfoMapper?(peer: PeerInfo): PeerInfo
}

export interface KadDHTComponents {
  peerId: PeerId
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
export function kadDHT (init: KadDHTInit): (components: KadDHTComponents) => KadDHT {
  return (components: KadDHTComponents) => new KadDHTClass(components, init)
}
