/**
 * @packageDocumentation
 *
 * Use the `createLibp2p` function to create a libp2p node.
 *
 * @example
 *
 * ```typescript
 * import { createLibp2p } from 'libp2p'
 *
 * const node = await createLibp2p({
 *   // ...other options
 * })
 * ```
 */

import { createLibp2pNode } from './libp2p.js'
import type { AbortOptions, RecursivePartial } from '@libp2p/interfaces'
import type { EventEmitter } from '@libp2p/interfaces/events'
import type { Startable } from '@libp2p/interfaces/startable'
import type { Multiaddr, Resolver } from '@multiformats/multiaddr'
import type { FaultTolerance } from './transport-manager.js'
import type { IdentifyServiceInit } from './identify/index.js'
import type { DualDHT } from '@libp2p/interface-dht'
import type { Datastore } from 'interface-datastore'
import type { AddressSorter, PeerStore, PeerStoreInit } from '@libp2p/interface-peer-store'
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
import type { Metrics } from '@libp2p/interface-metrics'
import type { PeerInfo } from '@libp2p/interface-peer-info'
import type { KeyChain } from './keychain/index.js'
import type { PingServiceInit } from './ping/index.js'
import type { FetchService, FetchServiceInit } from './fetch/index.js'
import type { Components } from './components.js'

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

export interface ConnectionManagerConfig {
  /**
   * The maximum number of connections libp2p is willing to have before it starts disconnecting. Defaults to `Infinity`
   */
  maxConnections: number

  /**
   * The minimum number of connections below which libp2p not activate preemptive disconnections. Defaults to `0`.
   */
  minConnections: number

  /**
   * Sets the maximum event loop delay (measured in milliseconds) this node is willing to endure before it starts disconnecting peers. Defaults to `Infinity`.
   */
  maxEventLoopDelay?: number

  /**
   * Sets the poll interval (in milliseconds) for assessing the current state and determining if this peer needs to force a disconnect. Defaults to `2000` (2 seconds).
   */
  pollInterval?: number

  /**
   * If true, try to connect to all discovered peers up to the connection manager limit
   */
  autoDial?: boolean

  /**
   * How long to wait between attempting to keep our number of concurrent connections
   * above minConnections
   */
  autoDialInterval: number

  /**
   * Sort the known addresses of a peer before trying to dial
   */
  addressSorter?: AddressSorter

  /**
   * Number of max concurrent dials
   */
  maxParallelDials?: number

  /**
   * Number of max addresses to dial for a given peer
   */
  maxAddrsToDial?: number

  /**
   * How long a dial attempt is allowed to take, including DNS resolution
   * of the multiaddr, opening a socket and upgrading it to a Connection.
   */
  dialTimeout?: number

  /**
   * When a new inbound connection is opened, the upgrade process (e.g. protect,
   * encrypt, multiplex etc) must complete within this number of ms.
   */
  inboundUpgradeTimeout: number

  /**
   * Number of max concurrent dials per peer
   */
  maxDialsPerPeer?: number

  /**
   * Multiaddr resolvers to use when dialing
   */
  resolvers?: Record<string, Resolver>

  /**
   * On startup we try to dial any peer that has previously been
   * tagged with KEEP_ALIVE up to this timeout in ms. (default: 60000)
   */
  startupReconnectTimeout?: number

  /**
   * A list of multiaddrs that will always be allowed (except if they are in the
   * deny list) to open connections to this node even if we've reached maxConnections
   */
  allow?: string[]

  /**
   * A list of multiaddrs that will never be allowed to open connections to
   * this node under any circumstances
   */
  deny?: string[]

  /**
   * If more than this many connections are opened per second by a single
   * host, reject subsequent connections
   */
  inboundConnectionThreshold?: number

  /**
   * The maximum number of parallel incoming connections allowed that have yet to
   * complete the connection upgrade - e.g. choosing connection encryption, muxer, etc
   */
  maxIncomingPendingConnections?: number
}

/**
 * For Libp2p configurations and modules details read the [Configuration Document](./CONFIGURATION.md).
 */
export interface Libp2pInit {
  /**
   * peerId instance (it will be created if not provided)
   */
  peerId: PeerId

  /**
   * Addresses for transport listening and to advertise to the network
   */
  addresses: AddressesConfig

  /**
   * libp2p Connection Manager configuration
   */
  connectionManager: ConnectionManagerConfig
  connectionGater: Partial<ConnectionGater>

  /**
   * libp2p transport manager configuration
   */
  transportManager: TransportManagerConfig

  /**
   * An optional datastore to persist peer information, DHT records, etc.
   *
   * An in-memory datastore will be used if one is not provided.
   */
  datastore: Datastore

  /**
   * libp2p PeerStore configuration
   */
  peerStore: PeerStoreInit

  /**
   * libp2p Peer routing service configuration
   */
  peerRouting: PeerRoutingConfig

  /**
   * keychain configuration
   */
  keychain: KeychainConfig
  nat: NatManagerConfig
  relay: RelayConfig

  /**
   * libp2p identify protocol options
   */
  identify: IdentifyServiceInit

  /**
   * libp2p ping protocol options
   */
  ping: PingServiceInit

  /**
   * libp2p fetch protocol options
   */
  fetch: FetchServiceInit

  /**
   * An array that must include at least 1 compliant transport
   */
  transports: Array<(components: Components) => Transport>
  streamMuxers?: Array<(components: Components) => StreamMuxerFactory>
  connectionEncryption?: Array<(components: Components) => ConnectionEncrypter>
  peerDiscovery?: Array<(components: Components) => PeerDiscovery>
  peerRouters?: Array<(components: Components) => PeerRouting>
  contentRouters?: Array<(components: Components) => ContentRouting>

  /**
   * Pass a DHT implementation to enable DHT operations
   */
  dht?: (components: Components) => DualDHT

  /**
   * A Metrics implementation can be supplied to collect metrics on this node
   */
  metrics?: (components: Components) => Metrics

  /**
   * If a PubSub implmentation is supplied, PubSub operations will become available
   */
  pubsub?: (components: Components) => PubSub

  /**
   * A ConnectionProtector can be used to create a secure overlay on top of the network using pre-shared keys
   */
  connectionProtector?: (components: Components) => ConnectionProtector
}

/**
 * Once you have a libp2p instance, you can listen to several events it emits, so that you can be notified of relevant network events.
 */
export interface Libp2pEvents {
  /**
   * @example
   *
   * ```js
   * libp2p.addEventListener('peer:discovery', (event) => {
   *    const peerInfo = event.detail
   *    // ...
   * })
   * ```
   */
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
  fetchService: {
    registerLookupFunction: FetchService['registerLookupFunction']
    unregisterLookupFunction: FetchService['unregisterLookupFunction']
  }

  /**
   * Get a deduplicated list of peer advertising multiaddrs by concatenating
   * the listen addresses used by transports with any configured
   * announce addresses as well as observed addresses reported by peers.
   *
   * If Announce addrs are specified, configured listen addresses will be
   * ignored though observed addresses will still be included.
   *
   * @example
   *
   * ```js
   * // ...
   * const listenMa = libp2p.getMultiaddrs()
   * // [ <Multiaddr 047f00000106f9ba - /ip4/127.0.0.1/tcp/63930> ]
   * ```
   */
  getMultiaddrs: () => Multiaddr[]

  /**
   * Return a list of all connections this node has open, optionally filtering
   * by a PeerId
   *
   * @example
   *
   * ```js
   * for (const connection of libp2p.getConnections()) {
   *   console.log(peerId, connection.remoteAddr.toString())
   *   // Logs the PeerId string and the observed remote multiaddr of each Connection
   * }
   * ```
   */
  getConnections: (peerId?: PeerId) => Connection[]

  /**
   * Return a list of all peers we currently have a connection open to
   */
  getPeers: () => PeerId[]

  /**
   * Dials to the provided peer. If successful, the known metadata of the
   * peer will be added to the nodes `peerStore`.
   *
   * If a PeerId is passed as the first argument, the peer will need to have known multiaddrs for it in the PeerStore.
   *
   * @example
   *
   * ```js
   * // ...
   * const conn = await libp2p.dial(remotePeerId)
   *
   * // create a new stream within the connection
   * const { stream, protocol } = await conn.newStream(['/echo/1.1.0', '/echo/1.0.0'])
   *
   * // protocol negotiated: 'echo/1.0.0' means that the other party only supports the older version
   *
   * // ...
   * await conn.close()
   * ```
   */
  dial: (peer: PeerId | Multiaddr, options?: AbortOptions) => Promise<Connection>

  /**
   * Dials to the provided peer and tries to handshake with the given protocols in order.
   * If successful, the known metadata of the peer will be added to the nodes `peerStore`,
   * and the `MuxedStream` will be returned together with the successful negotiated protocol.
   *
   * @example
   *
   * ```js
   * // ...
   * import { pipe } from 'it-pipe'
   *
   * const { stream, protocol } = await libp2p.dialProtocol(remotePeerId, protocols)
   *
   * // Use this new stream like any other duplex stream
   * pipe([1, 2, 3], stream, consume)
   * ```
   */
  dialProtocol: (peer: PeerId | Multiaddr, protocols: string | string[], options?: AbortOptions) => Promise<Stream>

  /**
   * Attempts to gracefully close an open connection to the given peer. If the connection is not closed in the grace period, it will be forcefully closed.
   *
   * @example
   *
   * ```js
   * // ...
   * await libp2p.hangUp(remotePeerId)
   * ```
   */
  hangUp: (peer: PeerId | Multiaddr) => Promise<void>

  /**
   * Sets up [multistream-select routing](https://github.com/multiformats/multistream-select) of protocols to their application handlers. Whenever a stream is opened on one of the provided protocols, the handler will be called. `handle` must be called in order to register a handler and support for a given protocol. This also informs other peers of the protocols you support.
   *
   * `libp2p.handle(protocols, handler, options)`
   *
   * In the event of a new handler for the same protocol being added, the first one is discarded.
   *
   * @example
   *
   * ```js
   * // ...
   * const handler = ({ connection, stream, protocol }) => {
   *   // use stream or connection according to the needs
   * }
   *
   * libp2p.handle('/echo/1.0.0', handler, {
   *   maxInboundStreams: 5,
   *   maxOutboundStreams: 5
   * })
   * ```
   */
  handle: (protocol: string | string[], handler: StreamHandler, options?: StreamHandlerOptions) => Promise<void>

  /**
   * Removes the handler for each protocol. The protocol
   * will no longer be supported on streams.
   *
   * @example
   *
   * ```js
   * // ...
   * libp2p.unhandle(['/echo/1.0.0'])
   * ```
   */
  unhandle: (protocols: string[] | string) => Promise<void>

  /**
   * Pings the given peer in order to obtain the operation latency
   *
   * @example
   *
   * ```js
   * // ...
   * const latency = await libp2p.ping(otherPeerId)
   * ```
   */
  ping: (peer: PeerId | Multiaddr, options?: AbortOptions) => Promise<number>

  /**
   * Sends a request to fetch the value associated with the given key from the given peer.
   *
   * ```js
   * // ...
   * const value = await libp2p.fetch(otherPeerId, '/some/key')
   * ```
   */
  fetch: (peer: PeerId | Multiaddr, key: string, options?: AbortOptions) => Promise<Uint8Array | null>

  /**
   * Returns the public key for the passed PeerId. If the PeerId is of the 'RSA' type
   * this may mean searching the DHT if the key is not present in the KeyStore.
   */
  getPublicKey: (peer: PeerId, options?: AbortOptions) => Promise<Uint8Array>
}

export type Libp2pOptions = RecursivePartial<Libp2pInit> & { start?: boolean }

/**
 * Returns a new instance of the Libp2p interface, generating a new PeerId
 * if one is not passed as part of the options.
 *
 * The node will be started unless `start: false` is passed as an option.
 *
 * @example
 *
 * ```js
 * import { createLibp2p } from 'libp2p'
 * import { tcp } from '@libp2p/tcp'
 * import { mplex } from '@libp2p/mplex'
 * import { noise } from '@chainsafe/libp2p-noise'
 *
 * // specify options
 * const options = {
 *   transports: [tcp()],
 *   streamMuxers: [mplex()],
 *   connectionEncryption: [noise()]
 * }
 *
 * // create libp2p
 * const libp2p = await createLibp2p(options)
 * ```
 */
export async function createLibp2p (options: Libp2pOptions): Promise<Libp2p> {
  const node = await createLibp2pNode(options)

  if (options.start !== false) {
    await node.start()
  }

  return node
}
