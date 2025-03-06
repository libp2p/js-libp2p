/**
 * @packageDocumentation
 *
 * Exports a `Libp2p` type for modules to use as a type argument.
 *
 * @example
 *
 * ```typescript
 * import type { Libp2p } from '@libp2p/interface'
 *
 * function doSomethingWithLibp2p (node: Libp2p) {
 *   // ...
 * }
 * ```
 */

import type { Connection, NewStreamOptions, Stream } from './connection.js'
import type { ContentRouting } from './content-routing.js'
import type { TypedEventTarget } from './event-target.js'
import type { Ed25519PublicKey, PublicKey, RSAPublicKey, Secp256k1PublicKey } from './keys.js'
import type { Metrics } from './metrics.js'
import type { Ed25519PeerId, PeerId, RSAPeerId, Secp256k1PeerId, URLPeerId } from './peer-id.js'
import type { PeerInfo } from './peer-info.js'
import type { PeerRouting } from './peer-routing.js'
import type { Address, Peer, PeerStore } from './peer-store.js'
import type { Startable } from './startable.js'
import type { StreamHandler, StreamHandlerOptions } from './stream-handler.js'
import type { Topology } from './topology.js'
import type { Listener, OutboundConnectionUpgradeEvents } from './transport.js'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { ProgressOptions, ProgressEvent } from 'progress-events'

/**
 * Used by the connection manager to sort addresses into order before dialling
 */
export interface AddressSorter {
  (a: Address, b: Address): -1 | 0 | 1
}

/**
 * Event detail emitted when peer data changes
 */
export interface PeerUpdate {
  peer: Peer
  previous?: Peer
}

/**
 * Peer data signed by the remote Peer's public key
 */
export interface SignedPeerRecord {
  addresses: Multiaddr[]
  seq: bigint
}

export interface TLSCertificate {
  /**
   * The private key that corresponds to the certificate in PEM format
   */
  key: string

  /**
   * The certificate chain in PEM format
   */
  cert: string
}

/**
 * Data returned from a successful identify response
 */
export interface IdentifyResult {
  /**
   * The remote Peer's PeerId
   */
  peerId: PeerId

  /**
   * The unsigned addresses they are listening on. Note - any multiaddrs present
   * in the signed peer record should be preferred to the value here.
   */
  listenAddrs: Multiaddr[]

  /**
   * The protocols the remote peer supports
   */
  protocols: string[]

  /**
   * The remote protocol version
   */
  protocolVersion?: string

  /**
   * The remote agent version
   */
  agentVersion?: string

  /**
   * The public key part of the remote PeerId - this is only useful for older
   * RSA-based PeerIds, the more modern Ed25519 and secp256k1 types have the
   * public key embedded in them
   */
  publicKey?: Uint8Array

  /**
   * If set this is the address that the remote peer saw the identify request
   * originate from
   */
  observedAddr?: Multiaddr

  /**
   * If sent by the remote peer this is the deserialized signed peer record
   */
  signedPeerRecord?: SignedPeerRecord

  /**
   * The connection that the identify protocol ran over
   */
  connection: Connection
}

/**
 * Logger component for libp2p
 */
export interface Logger {
  (formatter: any, ...args: any[]): void
  error(formatter: any, ...args: any[]): void
  trace(formatter: any, ...args: any[]): void
  enabled: boolean
}

/**
 * Peer logger component for libp2p
 */
export interface ComponentLogger {
  forComponent(name: string): Logger
}

/**
 * Once you have a libp2p instance, you can listen to several events it emits,
 * so that you can be notified of relevant network events.
 *
 * Event names are `noun:verb` so the first part is the name of the object
 * being acted on and the second is the action.
 */
export interface Libp2pEvents<T extends ServiceMap = ServiceMap> {
  /**
   * This event is dispatched when a new network peer is discovered.
   *
   * @example
   *
   * ```TypeScript
   * libp2p.addEventListener('peer:discovery', (event) => {
   *    const peerInfo = event.detail
   *    // ...
   * })
   * ```
   */
  'peer:discovery': CustomEvent<PeerInfo>

  /**
   * This event will be triggered any time a new peer connects.
   *
   * @example
   *
   * ```TypeScript
   * libp2p.addEventListener('peer:connect', (event) => {
   *   const peerId = event.detail
   *   // ...
   * })
   * ```
   */
  'peer:connect': CustomEvent<PeerId>

  /**
   * This event will be triggered any time we are disconnected from another
   * peer, regardless of the circumstances of that disconnection. If we happen
   * to have multiple connections to a peer, this event will **only** be
   * triggered when the last connection is closed.
   *
   * @example
   *
   * ```TypeScript
   * libp2p.addEventListener('peer:disconnect', (event) => {
   *   const peerId = event.detail
   *   // ...
   * })
   * ```
   */
  'peer:disconnect': CustomEvent<PeerId>

  /**
   * When a peer tagged with `keep-alive` disconnects, we will make multiple
   * attempts to reconnect to it with a backoff factor (see the connection
   * manager settings for details). If these all fail, the `keep-alive` tag will
   * be removed and this event will be emitted.
   *
   * @example
   *
   * ```TypeScript
   * libp2p.addEventListener('peer:reconnect-failure', (event) => {
   *   const peerId = event.detail
   *   // ...
   * })
   * ```
   */
  'peer:reconnect-failure': CustomEvent<PeerId>

  /**
   * This event is dispatched after a remote peer has successfully responded to
   * the identify protocol. Note that for this to be emitted, both peers must
   * have an identify service configured.
   *
   * @example
   *
   * ```TypeScript
   * libp2p.addEventListener('peer:identify', (event) => {
   *   const identifyResult = event.detail
   *   // ...
   * })
   * ```
   */
  'peer:identify': CustomEvent<IdentifyResult>

  /**
   * This event is dispatched when the peer store data for a peer has been
   * updated - e.g. their multiaddrs, protocols etc have changed.
   *
   * If they were previously known to this node, the old peer data will be
   * set in the `previous` field.
   *
   * This may be in response to the identify protocol running, a manual
   * update or some other event.
   */
  'peer:update': CustomEvent<PeerUpdate>

  /**
   * This event is dispatched when the current node's peer record changes -
   * for example a transport started listening on a new address or a new
   * protocol handler was registered.
   *
   * @example
   *
   * ```TypeScript
   * libp2p.addEventListener('self:peer:update', (event) => {
   *   const { peer } = event.detail
   *   // ...
   * })
   * ```
   */
  'self:peer:update': CustomEvent<PeerUpdate>

  /**
   * This event is dispatched when a transport begins listening on a new address
   */
  'transport:listening': CustomEvent<Listener>

  /**
   * This event is dispatched when a transport stops listening on an address
   */
  'transport:close': CustomEvent<Listener>

  /**
   * This event is dispatched when the connection manager has more than the
   * configured allowable max connections and has closed some connections to
   * bring the node back under the limit.
   */
  'connection:prune': CustomEvent<Connection[]>

  /**
   * This event notifies listeners when new incoming or outgoing connections
   * are opened.
   */
  'connection:open': CustomEvent<Connection>

  /**
   * This event notifies listeners when incoming or outgoing connections are
   * closed.
   */
  'connection:close': CustomEvent<Connection>

  /**
   * This event notifies listeners that a TLS certificate is available for use
   */
  'certificate:provision': CustomEvent<TLSCertificate>

  /**
   * This event notifies listeners that a new TLS certificate is available for
   * use. Any previous certificate may no longer be valid.
   */
  'certificate:renew': CustomEvent<TLSCertificate>

  /**
   * This event notifies listeners that the node has started
   *
   * ```TypeScript
   * libp2p.addEventListener('start', (event) => {
   *   console.info(libp2p.isStarted()) // true
   * })
   * ```
   */
  'start': CustomEvent<Libp2p<T>>

  /**
   * This event notifies listeners that the node has stopped
   *
   * ```TypeScript
   * libp2p.addEventListener('stop', (event) => {
   *   console.info(libp2p.isStarted()) // false
   * })
   * ```
   */
  'stop': CustomEvent<Libp2p<T>>
}

/**
 * A map of user defined services available on the libp2p node via the
 * `services` key
 *
 * @example
 *
 * ```TypeScript
 * const node = await createLibp2p({
 *   // ...other options
 *   services: {
 *     myService: myService({
 *       // ...service options
 *     })
 *   }
 * })
 *
 * // invoke methods on the service
 * node.services.myService.anOperation()
 * ```
 */
export type ServiceMap = Record<string, unknown>

export type PendingDialStatus = 'queued' | 'active' | 'error' | 'success'

/**
 * An item in the dial queue
 */
export interface PendingDial {
  /**
   * A unique identifier for this dial
   */
  id: string

  /**
   * The current status of the dial
   */
  status: PendingDialStatus

  /**
   * If known, this is the peer id that libp2p expects to be dialling
   */
  peerId?: PeerId

  /**
   * The list of multiaddrs that will be dialled. The returned connection will
   * use the first address that succeeds, all other dials part of this pending
   * dial will be cancelled.
   */
  multiaddrs: Multiaddr[]
}

export type Libp2pStatus = 'starting' | 'started' | 'stopping' | 'stopped'

export interface IsDialableOptions extends AbortOptions {
  /**
   * If the dial attempt would open a protocol, and the multiaddr being dialed
   * is a circuit relay address, passing true here would cause the test to fail
   * because that protocol would not be allowed to run over a data/time limited
   * connection.
   */
  runOnLimitedConnection?: boolean
}

export type TransportManagerDialProgressEvents =
  ProgressEvent<'transport-manager:selected-transport', string>

export type OpenConnectionProgressEvents =
  TransportManagerDialProgressEvents |
  ProgressEvent<'dial-queue:already-connected'> |
  ProgressEvent<'dial-queue:already-in-dial-queue'> |
  ProgressEvent<'dial-queue:add-to-dial-queue'> |
  ProgressEvent<'dial-queue:start-dial'> |
  ProgressEvent<'dial-queue:calculated-addresses', Address[]> |
  OutboundConnectionUpgradeEvents

export interface DialOptions extends AbortOptions, ProgressOptions {
  /**
   * If true, open a new connection to the remote even if one already exists
   */
  force?: boolean
}

export interface DialProtocolOptions extends NewStreamOptions {

}

/**
 * Libp2p nodes implement this interface.
 */
export interface Libp2p<T extends ServiceMap = ServiceMap> extends Startable, TypedEventTarget<Libp2pEvents<T>> {
  /**
   * The PeerId is a unique identifier for a node on the network.
   *
   * It is the hash of an RSA public key or, for Ed25519 or secp256k1 keys,
   * the key itself.
   *
   * @example
   *
   * ```TypeScript
   * console.info(libp2p.peerId)
   * // PeerId(12D3Foo...)
   * ````
   */
  peerId: PeerId

  /**
   * The peer store holds information we know about other peers on the network.
   * - multiaddrs, supported protocols, etc.
   *
   * @example
   *
   * ```TypeScript
   * const peer = await libp2p.peerStore.get(peerId)
   * console.info(peer)
   * // { id: PeerId(12D3Foo...), addresses: [] ... }
   * ```
   */
  peerStore: PeerStore

  /**
   * The peer routing subsystem allows the user to find peers on the network
   * or to find peers close to binary keys.
   *
   * @example
   *
   * ```TypeScript
   * const peerInfo = await libp2p.peerRouting.findPeer(peerId)
   * console.info(peerInfo)
   * // { id: PeerId(12D3Foo...), multiaddrs: [] ... }
   * ```
   *
   * @example
   *
   * ```TypeScript
   * for await (const peerInfo of libp2p.peerRouting.getClosestPeers(key)) {
   *   console.info(peerInfo)
   *   // { id: PeerId(12D3Foo...), multiaddrs: [] ... }
   * }
   * ```
   */
  peerRouting: PeerRouting

  /**
   * The content routing subsystem allows the user to find providers for content,
   * let the network know they are providers for content, and get/put values to
   * the DHT.
   *
   * @example
   *
   * ```TypeScript
   * for await (const peerInfo of libp2p.contentRouting.findProviders(cid)) {
   *   console.info(peerInfo)
   *   // { id: PeerId(12D3Foo...), multiaddrs: [] ... }
   * }
   * ```
   */
  contentRouting: ContentRouting

  /**
   * The metrics subsystem allows recording values to assess the health/performance
   * of the running node.
   *
   * @example
   *
   * ```TypeScript
   * const metric = libp2p.metrics.registerMetric({
   *   'my-metric'
   * })
   *
   * // later
   * metric.update(5)
   * ```
   */
  metrics?: Metrics

  /**
   * The logger used by this libp2p node
   */
  logger: ComponentLogger

  /**
   * The current status of the libp2p node
   */
  status: Libp2pStatus

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
   * ```TypeScript
   * const listenMa = libp2p.getMultiaddrs()
   * // [ <Multiaddr 047f00000106f9ba - /ip4/127.0.0.1/tcp/63930> ]
   * ```
   */
  getMultiaddrs(): Multiaddr[]

  /**
   * Returns a list of supported protocols
   *
   * @example
   *
   * ```TypeScript
   * const protocols = libp2p.getProtocols()
   * // [ '/ipfs/ping/1.0.0', '/ipfs/id/1.0.0' ]
   * ```
   */
  getProtocols(): string[]

  /**
   * Return a list of all connections this node has open, optionally filtering
   * by a PeerId
   *
   * @example
   *
   * ```TypeScript
   * for (const connection of libp2p.getConnections()) {
   *   console.log(peerId, connection.remoteAddr.toString())
   *   // Logs the PeerId string and the observed remote multiaddr of each Connection
   * }
   * ```
   */
  getConnections(peerId?: PeerId): Connection[]

  /**
   * Return the list of dials currently in progress or queued to start
   *
   * @example
   *
   * ```TypeScript
   * for (const pendingDial of libp2p.getDialQueue()) {
   *   console.log(pendingDial)
   * }
   * ```
   */
  getDialQueue(): PendingDial[]

  /**
   * Return a list of all peers we currently have a connection open to
   */
  getPeers(): PeerId[]

  /**
   * Dials to the provided peer. If successful, the known metadata of the
   * peer will be added to the nodes `peerStore`.
   *
   * If a PeerId is passed as the first argument, the peer will need to have known multiaddrs for it in the PeerStore.
   *
   * @example
   *
   * ```TypeScript
   * const conn = await libp2p.dial(remotePeerId)
   *
   * // create a new stream within the connection
   * const stream = await conn.newStream(['/echo/1.1.0', '/echo/1.0.0'])
   *
   * // protocol negotiated: 'echo/1.0.0' means that the other party only supports the older version
   *
   * // ...
   * await conn.close()
   * ```
   */
  dial(peer: PeerId | Multiaddr | Multiaddr[], options?: DialOptions): Promise<Connection>

  /**
   * Dials to the provided peer and tries to handshake with the given protocols in order.
   * If successful, the known metadata of the peer will be added to the nodes `peerStore`,
   * and the `MuxedStream` will be returned together with the successful negotiated protocol.
   *
   * @example
   *
   * ```TypeScript
   * import { pipe } from 'it-pipe'
   *
   * const { stream, protocol } = await libp2p.dialProtocol(remotePeerId, protocols)
   *
   * // Use this new stream like any other duplex stream
   * pipe([1, 2, 3], stream, consume)
   * ```
   */
  dialProtocol(peer: PeerId | Multiaddr | Multiaddr[], protocols: string | string[], options?: DialProtocolOptions): Promise<Stream>

  /**
   * Attempts to gracefully close an open connection to the given peer. If the
   * connection is not closed in the grace period, it will be forcefully closed.
   *
   * An AbortSignal can optionally be passed to control when the connection is
   * forcefully closed.
   *
   * @example
   *
   * ```TypeScript
   * await libp2p.hangUp(remotePeerId)
   * ```
   */
  hangUp(peer: PeerId | Multiaddr, options?: AbortOptions): Promise<void>

  /**
   * Sets up [multistream-select routing](https://github.com/multiformats/multistream-select) of protocols to their application handlers. Whenever a stream is opened on one of the provided protocols, the handler will be called. `handle` must be called in order to register a handler and support for a given protocol. This also informs other peers of the protocols you support.
   *
   * `libp2p.handle(protocols, handler, options)`
   *
   * In the event of a new handler for the same protocol being added and error
   * will be thrown. Pass `force: true` to override this.
   *
   * @example
   *
   * ```TypeScript
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
  handle(protocol: string | string[], handler: StreamHandler, options?: StreamHandlerOptions): Promise<void>

  /**
   * Removes the handler for each protocol. The protocol
   * will no longer be supported on streams.
   *
   * @example
   *
   * ```TypeScript
   * libp2p.unhandle(['/echo/1.0.0'])
   * ```
   */
  unhandle(protocols: string[] | string): Promise<void>

  /**
   * Register a topology to be informed when peers are encountered that
   * support the specified protocol
   *
   * @example
   *
   * ```TypeScript
   * const id = await libp2p.register('/echo/1.0.0', {
   *   onConnect: (peer, connection) => {
   *     // handle connect
   *   },
   *   onDisconnect: (peer, connection) => {
   *     // handle disconnect
   *   }
   * })
   * ```
   */
  register(protocol: string, topology: Topology): Promise<string>

  /**
   * Unregister topology to no longer be informed when peers connect or
   * disconnect.
   *
   * @example
   *
   * ```TypeScript
   * const id = await libp2p.register(...)
   *
   * libp2p.unregister(id)
   * ```
   */
  unregister(id: string): void

  /**
   * Returns the public key for the passed PeerId. If the PeerId is of the 'RSA'
   * type this may mean searching the routing if the peer's key is not present
   * in the peer store.
   */
  getPublicKey(peer: Ed25519PeerId, options?: AbortOptions): Promise<Ed25519PublicKey>
  getPublicKey(peer: Secp256k1PeerId, options?: AbortOptions): Promise<Secp256k1PublicKey>
  getPublicKey(peer: RSAPeerId, options?: AbortOptions): Promise<RSAPublicKey>
  getPublicKey(peer: URLPeerId, options?: AbortOptions): Promise<never>
  getPublicKey(peer: PeerId, options?: AbortOptions): Promise<PublicKey>

  /**
   * Given the current node configuration, returns a promise of `true` or
   * `false` if the node would attempt to dial the passed multiaddr.
   *
   * This means a relevant transport is configured, and the connection gater
   * would not block the dial attempt.
   *
   * This may involve resolving DNS addresses so you should pass an AbortSignal.
   */
  isDialable(multiaddr: Multiaddr | Multiaddr[], options?: IsDialableOptions): Promise<boolean>

  /**
   * A set of user defined services
   */
  services: T
}

/**
 * Metadata about the current node
 */
export interface NodeInfo {
  /**
   * The implementation name
   */
  name: string

  /**
   * The implementation version
   */
  version: string

  /**
   * A string that contains information about the implementation and runtime
   */
  userAgent: string
}

/**
 * An object that contains an AbortSignal as
 * the optional `signal` property.
 *
 * @example
 *
 * ```TypeScript
 * const controller = new AbortController()
 *
 * aLongRunningOperation({
 *   signal: controller.signal
 * })
 *
 * // later
 *
 * controller.abort()
 */
export interface AbortOptions {
  signal?: AbortSignal
}

/**
 * An object that contains a Logger as the `log` property.
 */
export interface LoggerOptions {
  log: Logger
}

/**
 * An object that includes a trace object that is passed onwards.
 *
 * This is used by metrics method tracing to link function calls together.
 */
export interface TraceOptions {
  trace?: any
}

/**
 * A signal that needs to be cleared when no longer in use
 */
export interface ClearableSignal extends AbortSignal {
  clear(): void
}

/**
 * When a routing operation involves reading values, these options allow
 * controlling where the values are read from. By default libp2p will check
 * local caches but may not use the network if a valid local value is found,
 * these options allow tuning that behavior.
 */
export interface RoutingOptions extends AbortOptions, ProgressOptions, TraceOptions {
  /**
   * Pass `false` to not use the network
   *
   * @default true
   */
  useNetwork?: boolean

  /**
   * Pass `false` to not use cached values
   *
   * @default true
   */
  useCache?: boolean
}

/**
 * This symbol is used by libp2p services to define the capabilities they can
 * provide to other libp2p services.
 *
 * The service should define a property with this symbol as the key and the
 * value should be a string array of provided capabilities.
 */
export const serviceCapabilities = Symbol.for('@libp2p/service-capabilities')

/**
 * This symbol is used by libp2p services to define the capabilities they
 * require from other libp2p services.
 *
 * The service should define a property with this symbol as the key and the
 * value should be a string array of required capabilities.
 */
export const serviceDependencies = Symbol.for('@libp2p/service-dependencies')

export * from './connection.js'
export * from './connection-encrypter.js'
export * from './connection-gater.js'
export * from './content-routing.js'
export * from './keys.js'
export * from './metrics.js'
export * from './peer-discovery.js'
export * from './peer-id.js'
export * from './peer-info.js'
export * from './peer-routing.js'
export * from './peer-store.js'
export * from './pubsub.js'
export * from './record.js'
export * from './stream-handler.js'
export * from './stream-muxer.js'
export * from './topology.js'
export * from './transport.js'
export * from './errors.js'
export * from './event-target.js'
export * from './events.js'
export * from './startable.js'
