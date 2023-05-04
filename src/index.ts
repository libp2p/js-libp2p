import { DefaultDualKadDHT } from './dual-kad-dht.js'
import type { ProvidersInit } from './providers.js'
import type { AddressManager } from '@libp2p/interface-address-manager'
import type { ConnectionManager } from '@libp2p/interface-connection-manager'
import type { Metrics } from '@libp2p/interface-metrics'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { PeerInfo } from '@libp2p/interface-peer-info'
import type { PeerStore } from '@libp2p/interface-peer-store'
import type { Registrar } from '@libp2p/interface-registrar'
import type { AbortOptions } from '@libp2p/interfaces'
import type { Datastore } from 'interface-datastore'
import type { CID } from 'multiformats/cid'

/**
 * The types of events emitted during DHT queries
 */
export enum EventTypes {
  SENDING_QUERY = 0,
  PEER_RESPONSE,
  FINAL_PEER,
  QUERY_ERROR,
  PROVIDER,
  VALUE,
  ADDING_PEER,
  DIALING_PEER
}

/**
 * The types of messages sent to peers during DHT queries
 */
export enum MessageType {
  PUT_VALUE = 0,
  GET_VALUE,
  ADD_PROVIDER,
  GET_PROVIDERS,
  FIND_NODE,
  PING
}

export type MessageName = keyof typeof MessageType

export interface DHTRecord {
  key: Uint8Array
  value: Uint8Array
  timeReceived?: Date
}

export interface QueryOptions extends AbortOptions {
  queryFuncTimeout?: number
}

/**
 * Emitted when sending queries to remote peers
 */
export interface SendingQueryEvent {
  to: PeerId
  type: EventTypes.SENDING_QUERY
  name: 'SENDING_QUERY'
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
export interface AddingPeerEvent {
  type: EventTypes.ADDING_PEER
  name: 'ADDING_PEER'
  peer: PeerId
}

/**
 * Emitted when peers are dialled as part of a query
 */
export interface DialingPeerEvent {
  peer: PeerId
  type: EventTypes.DIALING_PEER
  name: 'DIALING_PEER'
}

export type QueryEvent = SendingQueryEvent | PeerResponseEvent | FinalPeerEvent | QueryErrorEvent | ProviderEvent | ValueEvent | AddingPeerEvent | DialingPeerEvent

export interface RoutingTable {
  size: number
}

export interface KadDHT {
  /**
   * Get a value from the DHT, the final ValueEvent will be the best value
   */
  get: (key: Uint8Array, options?: QueryOptions) => AsyncIterable<QueryEvent>

  /**
   * Find providers of a given CID
   */
  findProviders: (key: CID, options?: QueryOptions) => AsyncIterable<QueryEvent>

  /**
   * Find a peer on the DHT
   */
  findPeer: (id: PeerId, options?: QueryOptions) => AsyncIterable<QueryEvent>

  /**
   * Find the closest peers to the passed key
   */
  getClosestPeers: (key: Uint8Array, options?: QueryOptions) => AsyncIterable<QueryEvent>

  /**
   * Store provider records for the passed CID on the DHT pointing to us
   */
  provide: (key: CID, options?: QueryOptions) => AsyncIterable<QueryEvent>

  /**
   * Store the passed value under the passed key on the DHT
   */
  put: (key: Uint8Array, value: Uint8Array, options?: QueryOptions) => AsyncIterable<QueryEvent>

  /**
   * Returns the mode this node is in
   */
  getMode: () => Promise<'client' | 'server'>

  /**
   * If 'server' this node will respond to DHT queries, if 'client' this node will not
   */
  setMode: (mode: 'client' | 'server') => Promise<void>

  /**
   * Force a routing table refresh
   */
  refreshRoutingTable: () => Promise<void>
}

export interface SingleKadDHT extends KadDHT {
  routingTable: RoutingTable
}

export interface DualKadDHT extends KadDHT {
  wan: SingleKadDHT
  lan: SingleKadDHT
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
   * How many peers to store in each kBucket (default 20)
   */
  kBucketSize?: number

  /**
   * Whether to start up as a DHT client or server
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
   * here in ms (default: 1000)
   */
  initialQuerySelfInterval?: number

  /**
   * After startup by default all queries will be paused until the initial
   * self-query has run and there are some peers in the routing table.
   *
   * Pass true here to disable this behaviour. (default: false)
   */
  allowQueryWithZeroPeers?: boolean

  /**
   * A custom protocol prefix to use (default: '/ipfs')
   */
  protocolPrefix?: string

  /**
   * How long to wait in ms when pinging DHT peers to decide if they
   * should be evicted from the routing table or not (default 10000)
   */
  pingTimeout?: number

  /**
   * How many peers to ping in parallel when deciding if they should
   * be evicted from the routing table or not (default 10)
   */
  pingConcurrency?: number

  /**
   * How many parallel incoming streams to allow on the DHT protocol per-connection
   */
  maxInboundStreams?: number

  /**
   * How many parallel outgoing streams to allow on the DHT protocol per-connection
   */
  maxOutboundStreams?: number

  /**
   * Initialization options for the Providers component
   */
  providers?: ProvidersInit
}

export interface KadDHTComponents {
  peerId: PeerId
  registrar: Registrar
  addressManager: AddressManager
  peerStore: PeerStore
  metrics?: Metrics
  connectionManager: ConnectionManager
  datastore: Datastore
}

export function kadDHT (init?: KadDHTInit): (components: KadDHTComponents) => DualKadDHT {
  return (components: KadDHTComponents) => new DefaultDualKadDHT(components, init)
}
