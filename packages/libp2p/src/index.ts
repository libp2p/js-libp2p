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

import { generateKeyPair } from '@libp2p/crypto/keys'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { validateConfig } from './config.js'
import { Libp2p as Libp2pClass } from './libp2p.js'
import type { AddressManagerInit, AddressFilter } from './address-manager/index.js'
import type { Components } from './components.js'
import type { ConnectionManagerInit } from './connection-manager/index.js'
import type { ConnectionMonitorInit } from './connection-monitor.js'
import type { TransportManagerInit } from './transport-manager.js'
import type { Libp2p, ServiceMap, ComponentLogger, NodeInfo, ConnectionProtector, ConnectionEncrypter, ConnectionGater, ContentRouting, Metrics, PeerDiscovery, PeerRouting, StreamMuxerFactory, Transport, PrivateKey } from '@libp2p/interface'
import type { PersistentPeerStoreInit } from '@libp2p/peer-store'
import type { DNS } from '@multiformats/dns'
import type { Datastore } from 'interface-datastore'

export type ServiceFactoryMap<T extends ServiceMap = ServiceMap> = {
  [Property in keyof T]: (components: Components & T) => T[Property]
}

export type { AddressManagerInit, AddressFilter }

export { dnsaddrResolver } from './connection-manager/resolvers/index.ts'

/**
 * For Libp2p configurations and modules details read the [Configuration Document](https://github.com/libp2p/js-libp2p/tree/main/doc/CONFIGURATION.md).
 */
export interface Libp2pInit<T extends ServiceMap = ServiceMap> {
  /**
   * The private key is used in cryptographic operations and the Peer ID derived
   * from it's corresponding public key is used to identify the node to other
   * peers on the network.
   *
   * If this is not passed a new Ed25519 private key will be generated.
   */
  privateKey?: PrivateKey

  /**
   * Metadata about the node - implementation name, version number, etc
   */
  nodeInfo?: Partial<NodeInfo>

  /**
   * Addresses for transport listening and to advertise to the network
   */
  addresses?: AddressManagerInit

  /**
   * libp2p Connection Manager configuration
   */
  connectionManager?: ConnectionManagerInit

  /**
   * libp2p Connection Monitor configuration
   */
  connectionMonitor?: ConnectionMonitorInit

  /**
   * A connection gater can deny new connections based on user criteria
   */
  connectionGater?: ConnectionGater

  /**
   * libp2p transport manager configuration
   */
  transportManager?: TransportManagerInit

  /**
   * An optional datastore to persist peer information, DHT records, etc.
   *
   * An in-memory datastore will be used if one is not provided.
   */
  datastore?: Datastore

  /**
   * libp2p PeerStore configuration
   */
  peerStore?: PersistentPeerStoreInit

  /**
   * Transports are low-level communication channels
   */
  transports?: Array<(components: Components) => Transport>

  /**
   * Stream muxers allow the creation of many data streams over a single
   * connection.
   */
  streamMuxers?: Array<(components: Components) => StreamMuxerFactory>

  /**
   * Connection encrypters ensure that data sent over connections cannot be
   * eavesdropped on, and that the remote peer possesses the private key that
   * corresponds to the public key that it's Peer ID is derived from.
   */
  connectionEncrypters?: Array<(components: Components) => ConnectionEncrypter>

  /**
   * Peer discovery mechanisms allow finding peers on the network
   */
  peerDiscovery?: Array<(components: Components) => PeerDiscovery>

  /**
   * Peer routers provide implementations for peer routing queries
   */
  peerRouters?: Array<(components: Components) => PeerRouting>

  /**
   * Content routers provide implementations for content routing queries
   */
  contentRouters?: Array<(components: Components) => ContentRouting>

  /**
   * A Metrics implementation can be supplied to collect metrics on this node
   */
  metrics?(components: Components): Metrics

  /**
   * A ConnectionProtector can be used to create a secure overlay on top of the network using pre-shared keys
   */
  connectionProtector?(components: Components): ConnectionProtector

  /**
   * Arbitrary libp2p modules
   */
  services?: ServiceFactoryMap<T>

  /**
   * An optional logging implementation that can be used to write runtime logs.
   *
   * Set the `DEBUG` env var or the `debug` key on LocalStorage to see logs.
   *
   * @example
   *
   * Node.js:
   *
   * ```console
   * $ DEBUG="*libp2p:*" node myscript.js
   * ```
   *
   * Browsers:
   *
   * ```TypeScript
   * localStorage.setItem('debug', '*libp2p:*')
   * ```
   */
  logger?: ComponentLogger

  /**
   * An optional DNS resolver configuration. If omitted the default DNS resolver
   * for the platform will be used which means `node:dns` on Node.js and
   * DNS-JSON-over-HTTPS for browsers using Google and Cloudflare servers.
   */
  dns?: DNS
}

export type { Libp2p, ConnectionManagerInit, ConnectionMonitorInit, TransportManagerInit }

export type Libp2pOptions<T extends ServiceMap = ServiceMap> = Libp2pInit<T> & { start?: boolean }

/**
 * Returns a new instance of the Libp2p interface, generating a new PeerId
 * if one is not passed as part of the options.
 *
 * The node will be started unless `start: false` is passed as an option.
 *
 * @example
 *
 * ```TypeScript
 * import { createLibp2p } from 'libp2p'
 * import { tcp } from '@libp2p/tcp'
 * import { mplex } from '@libp2p/mplex'
 * import { noise } from '@chainsafe/libp2p-noise'
 * import { yamux } from '@chainsafe/libp2p-yamux'
 *
 * // specify options
 * const options = {
 *   transports: [tcp()],
 *   streamMuxers: [yamux(), mplex()],
 *   connectionEncrypters: [noise()]
 * }
 *
 * // create libp2p
 * const libp2p = await createLibp2p(options)
 * ```
 */
export async function createLibp2p <T extends ServiceMap = ServiceMap> (options: Libp2pOptions<T> = {}): Promise<Libp2p<T>> {
  options.privateKey ??= await generateKeyPair('Ed25519')

  const node = new Libp2pClass({
    ...await validateConfig(options),
    peerId: peerIdFromPrivateKey(options.privateKey)
  })

  if (options.start !== false) {
    await node.start()
  }

  return node
}

// a non-exhaustive list of methods found on the libp2p object
const LIBP2P_METHODS = ['dial', 'dialProtocol', 'hangUp', 'handle', 'unhandle', 'getMultiaddrs', 'getProtocols']

/**
 * Returns true if the passed object is a libp2p node - this can be used for
 * type guarding in TypeScript.
 */
export function isLibp2p <T extends ServiceMap = ServiceMap> (obj?: any): obj is Libp2p<T> {
  if (obj == null) {
    return false
  }

  if (obj instanceof Libp2pClass) {
    return true
  }

  // if these are all functions it's probably a libp2p object
  return LIBP2P_METHODS.every(m => typeof obj[m] === 'function')
}
