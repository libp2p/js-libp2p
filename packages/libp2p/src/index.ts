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
import type { AddressManagerInit } from './address-manager/index.js'
import type { Components } from './components.js'
import type { ConnectionManagerInit } from './connection-manager/index.js'
import type { TransportManagerInit } from './transport-manager.js'
import type { Libp2p, ServiceMap, RecursivePartial, ComponentLogger, NodeInfo, ConnectionProtector, ConnectionEncrypter, ConnectionGater, ContentRouting, Metrics, PeerDiscovery, PeerId, PeerRouting, StreamMuxerFactory, Transport } from '@libp2p/interface'
import type { PersistentPeerStoreInit } from '@libp2p/peer-store'
import type { Datastore } from 'interface-datastore'

export type ServiceFactoryMap<T extends Record<string, unknown> = Record<string, unknown>> = {
  [Property in keyof T]: (components: Components) => T[Property]
}

/**
 * For Libp2p configurations and modules details read the [Configuration Document](./CONFIGURATION.md).
 */
export interface Libp2pInit<T extends ServiceMap = { x: Record<string, unknown> }> {
  /**
   * peerId instance (it will be created if not provided)
   */
  peerId: PeerId

  /**
   * Metadata about the node - implementation name, version number, etc
   */
  nodeInfo: NodeInfo

  /**
   * Addresses for transport listening and to advertise to the network
   */
  addresses: AddressManagerInit

  /**
   * libp2p Connection Manager configuration
   */
  connectionManager: ConnectionManagerInit

  /**
   * A connection gater can deny new connections based on user criteria
   */
  connectionGater: ConnectionGater

  /**
   * libp2p transport manager configuration
   */
  transportManager: TransportManagerInit

  /**
   * An optional datastore to persist peer information, DHT records, etc.
   *
   * An in-memory datastore will be used if one is not provided.
   */
  datastore: Datastore

  /**
   * libp2p PeerStore configuration
   */
  peerStore: PersistentPeerStoreInit

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
  services: ServiceFactoryMap<T>

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
   * ```javascript
   * localStorage.setItem('debug', '*libp2p:*')
   * ```
   */
  logger?: ComponentLogger
}

export type { Libp2p }

export type Libp2pOptions<T extends ServiceMap = Record<string, unknown>> = RecursivePartial<Libp2pInit<T>> & { start?: boolean }

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
 * import { yamux } from '@chainsafe/libp2p-yamux'
 *
 * // specify options
 * const options = {
 *   transports: [tcp()],
 *   streamMuxers: [yamux(), mplex()],
 *   connectionEncryption: [noise()]
 * }
 *
 * // create libp2p
 * const libp2p = await createLibp2p(options)
 * ```
 */
export async function createLibp2p <T extends ServiceMap = { x: Record<string, unknown> }> (options: Libp2pOptions<T>): Promise<Libp2p<T>> {
  const node = await createLibp2pNode(options)

  if (options.start !== false) {
    await node.start()
  }

  return node
}
