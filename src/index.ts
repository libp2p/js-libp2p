import { createLibp2pNode } from './libp2p.js'
import type { AbortOptions, EventEmitter, RecursivePartial, Startable } from '@libp2p/interfaces'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { FAULT_TOLERANCE } from './transport-manager.js'
import type { HostProperties } from './identify/index.js'
import type { DualDHT } from '@libp2p/interfaces/dht'
import type { Datastore } from 'interface-datastore'
import type { PeerStore, PeerStoreInit } from '@libp2p/interfaces/peer-store'
import type { PeerId } from '@libp2p/interfaces/peer-id'
import type { AutoRelayConfig, RelayAdvertiseConfig } from './circuit/index.js'
import type { PeerDiscovery } from '@libp2p/interfaces/peer-discovery'
import type { Connection, ConnectionGater, ConnectionProtector, ProtocolStream } from '@libp2p/interfaces/connection'
import type { Transport } from '@libp2p/interfaces/transport'
import type { StreamMuxerFactory } from '@libp2p/interfaces/stream-muxer'
import type { ConnectionEncrypter } from '@libp2p/interfaces/connection-encrypter'
import type { PeerRouting } from '@libp2p/interfaces/peer-routing'
import type { ContentRouting } from '@libp2p/interfaces/content-routing'
import type { PubSub } from '@libp2p/interfaces/pubsub'
import type { StreamHandler } from '@libp2p/interfaces/registrar'
import type { MetricsInit } from '@libp2p/interfaces/metrics'
import type { PeerData } from '@libp2p/interfaces/peer-data'
import type { DialerInit } from '@libp2p/interfaces/dialer'
import type { KeyChain } from './keychain/index.js'

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

export interface ConnectionManagerConfig {
  /**
   * If true, try to connect to all discovered peers up to the connection manager limit
   */
  autoDial?: boolean

  /**
   * The maximum number of connections to keep open
   */
  maxConnections: number

  /**
   * The minimum number of connections to keep open
   */
  minConnections: number

  /**
   * How long to wait between attempting to keep our number of concurrent connections
   * above minConnections
   */
  autoDialInterval: number
}

export interface TransportManagerConfig {
  faultTolerance?: FAULT_TOLERANCE
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
  host: HostProperties
  addresses: AddressesConfig
  connectionManager: ConnectionManagerConfig
  connectionGater: Partial<ConnectionGater>
  transportManager: TransportManagerConfig
  datastore: Datastore
  dialer: DialerInit
  metrics: MetricsInit
  peerStore: PeerStoreInit
  peerRouting: PeerRoutingConfig
  keychain: KeychainConfig
  protocolPrefix: string
  nat: NatManagerConfig
  relay: RelayConfig

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
  'peer:discovery': CustomEvent<PeerData>
}

export interface Libp2p extends Startable, EventEmitter<Libp2pEvents> {
  peerId: PeerId
  peerStore: PeerStore
  peerRouting: PeerRouting
  contentRouting: ContentRouting
  keychain: KeyChain

  pubsub?: PubSub
  dht?: DualDHT

  /**
   * Load keychain keys from the datastore.
   * Imports the private key as 'self', if needed.
   */
  loadKeychain: () => Promise<void>

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
  dialProtocol: (peer: PeerId | Multiaddr, protocols: string | string[], options?: AbortOptions) => Promise<ProtocolStream>

  /**
   * Disconnects all connections to the given `peer`
   */
  hangUp: (peer: PeerId | Multiaddr | string) => Promise<void>

  /**
   * Registers the `handler` for each protocol
   */
  handle: (protocol: string | string[], handler: StreamHandler) => Promise<void>

  /**
   * Removes the handler for each protocol. The protocol
   * will no longer be supported on streams.
   */
  unhandle: (protocols: string[] | string) => Promise<void>

  /**
   * Pings the given peer in order to obtain the operation latency
   */
  ping: (peer: Multiaddr |PeerId) => Promise<number>

  /**
   * Sends a request to fetch the value associated with the given key from the given peer.
   */
  fetch: (peer: PeerId | Multiaddr | string, key: string) => Promise<Uint8Array | null>
}

export type Libp2pOptions = RecursivePartial<Libp2pInit>

/**
 * Returns a new instance of the Libp2p interface, generating a new PeerId
 * if one is not passed as part of the options.
 */
export async function createLibp2p (options: Libp2pOptions): Promise<Libp2p> {
  return await createLibp2pNode(options)
}
