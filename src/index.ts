import { createLibp2pNode } from './libp2p.js'
import type { AbortOptions, RecursivePartial } from '@libp2p/interfaces'
import type { EventEmitter } from '@libp2p/interfaces/events'
import type { Startable } from '@libp2p/interfaces/startable'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { FaultTolerance } from './transport-manager.js'
import type { IdentifyServiceInit } from './identify/index.js'
import type { DualDHT } from '@libp2p/interface-dht'
import type { Datastore } from 'interface-datastore'
import type { PeerStore, PeerStoreInit } from '@libp2p/interface-peer-store'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { AutoRelayConfig, RelayAdvertiseConfig } from './circuit/index.js'
import type { PeerDiscovery } from '@libp2p/interface-peer-discovery'
import type { Connection, ConnectionGater, ConnectionProtector, Stream } from '@libp2p/interface-connection'
import type { Transport } from '@libp2p/interface-transport'
import type { StreamMuxerFactory } from '@libp2p/interface-stream-muxer'
import type { ConnectionEncrypter } from '@libp2p/interface-connection-encrypter'
import type { PeerRouting } from '@libp2p/interface-peer-routing'
import type { ContentRouting } from '@libp2p/interface-content-routing'
import type { PubSub } from '@libp2p/interface-pubsub'
import type { Registrar, StreamHandler, StreamHandlerOptions } from '@libp2p/interface-registrar'
import type { ConnectionManager } from '@libp2p/interface-connection-manager'
import type { Metrics, MetricsInit } from '@libp2p/interface-metrics'
import type { PeerInfo } from '@libp2p/interface-peer-info'
import type { KeyChain } from './keychain/index.js'
import type { ConnectionManagerInit } from './connection-manager/index.js'
import type { PingServiceInit } from './ping/index.js'
import type { FetchServiceInit } from './fetch/index.js'

export interface PersistentPeerStoreOptions {
  threshold?: number
}

export interface DEKConfig {
  keyLength: number
  iterationCount: number
  salt: string
  hash: string
}

export interface KeychainConfig {
  pass?: string
  dek?: DEKConfig
}

export interface MetricsConfig {
  enabled?: boolean
}

export interface HopConfig {
  enabled?: boolean
  active?: boolean
  timeout: number
}

export interface RelayConfig {
  enabled: boolean
  advertise: RelayAdvertiseConfig
  hop: HopConfig
  autoRelay: AutoRelayConfig
}

export interface NatManagerConfig {
  enabled: boolean
  externalAddress?: string
  localAddress?: string
  description?: string
  ttl?: number
  keepAlive: boolean
  gateway?: string
}

export interface AddressesConfig {
  listen: string[]
  announce: string[]
  noAnnounce: string[]
  announceFilter: (multiaddrs: Multiaddr[]) => Multiaddr[]
}

export interface TransportManagerConfig {
  faultTolerance?: FaultTolerance
}

export interface PeerStoreConfig {
  persistence?: boolean
  threshold?: number
}

export interface PeerRoutingConfig {
  refreshManager: RefreshManagerConfig
}

export interface RefreshManagerConfig {
  enabled?: boolean
  interval: number
  bootDelay: number
}

export interface Libp2pInit {
  peerId: PeerId
  addresses: AddressesConfig
  connectionManager: ConnectionManagerInit
  connectionGater: Partial<ConnectionGater>
  transportManager: TransportManagerConfig
  datastore: Datastore
  metrics: MetricsInit
  peerStore: PeerStoreInit
  peerRouting: PeerRoutingConfig
  keychain: KeychainConfig
  nat: NatManagerConfig
  relay: RelayConfig
  identify: IdentifyServiceInit
  ping: PingServiceInit
  fetch: FetchServiceInit

  transports: Transport[]
  streamMuxers?: StreamMuxerFactory[]
  connectionEncryption?: ConnectionEncrypter[]
  peerDiscovery?: PeerDiscovery[]
  peerRouters?: PeerRouting[]
  contentRouters?: ContentRouting[]
  dht?: DualDHT
  pubsub?: PubSub
  connectionProtector?: ConnectionProtector
}

export interface Libp2pEvents {
  'peer:discovery': CustomEvent<PeerInfo>
}

export interface Libp2p extends Startable, EventEmitter<Libp2pEvents> {
  peerId: PeerId
  peerStore: PeerStore
  peerRouting: PeerRouting
  contentRouting: ContentRouting
  keychain: KeyChain
  connectionManager: ConnectionManager
  registrar: Registrar
  metrics?: Metrics
  pubsub: PubSub
  dht: DualDHT

  /**
   * Get a deduplicated list of peer advertising multiaddrs by concatenating
   * the listen addresses used by transports with any configured
   * announce addresses as well as observed addresses reported by peers.
   *
   * If Announce addrs are specified, configured listen addresses will be
   * ignored though observed addresses will still be included.
   */
  getMultiaddrs: () => Multiaddr[]

  /**
   * Return a list of all connections this node has open, optionally filtering
   * by a PeerId
   */
  getConnections: (peerId?: PeerId) => Connection[]

  /**
   * Return a list of all peers we currently have a connection open to
   */
  getPeers: () => PeerId[]

  /**
   * Dials to the provided peer. If successful, the known metadata of the
   * peer will be added to the nodes `peerStore`
   */
  dial: (peer: PeerId | Multiaddr, options?: AbortOptions) => Promise<Connection>

  /**
   * Dials to the provided peer and tries to handshake with the given protocols in order.
   * If successful, the known metadata of the peer will be added to the nodes `peerStore`,
   * and the `MuxedStream` will be returned together with the successful negotiated protocol.
   */
  dialProtocol: (peer: PeerId | Multiaddr, protocols: string | string[], options?: AbortOptions) => Promise<Stream>

  /**
   * Disconnects all connections to the given `peer`
   */
  hangUp: (peer: PeerId | Multiaddr | string) => Promise<void>

  /**
   * Registers the `handler` for each protocol
   */
  handle: (protocol: string | string[], handler: StreamHandler, options?: StreamHandlerOptions) => Promise<void>

  /**
   * Removes the handler for each protocol. The protocol
   * will no longer be supported on streams.
   */
  unhandle: (protocols: string[] | string) => Promise<void>

  /**
   * Pings the given peer in order to obtain the operation latency
   */
  ping: (peer: Multiaddr | PeerId, options?: AbortOptions) => Promise<number>

  /**
   * Sends a request to fetch the value associated with the given key from the given peer.
   */
  fetch: (peer: PeerId | Multiaddr | string, key: string, options?: AbortOptions) => Promise<Uint8Array | null>

  /**
   * Returns the public key for the passed PeerId. If the PeerId is of the 'RSA' type
   * this may mean searching the DHT if the key is not present in the KeyStore.
   */
  getPublicKey: (peer: PeerId, options?: AbortOptions) => Promise<Uint8Array>
}

export type Libp2pOptions = RecursivePartial<Libp2pInit>

/**
 * Returns a new instance of the Libp2p interface, generating a new PeerId
 * if one is not passed as part of the options.
 */
export async function createLibp2p (options: Libp2pOptions): Promise<Libp2p> {
  return await createLibp2pNode(options)
}
