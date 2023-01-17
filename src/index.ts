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
import type { RecursivePartial } from '@libp2p/interfaces'
import type { TransportManagerInit } from './transport-manager.js'
import type { IdentifyServiceInit } from './identify/index.js'
import type { DualDHT } from '@libp2p/interface-dht'
import type { Datastore } from 'interface-datastore'
import type { PeerStoreInit } from '@libp2p/interface-peer-store'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { RelayConfig } from './circuit/index.js'
import type { PeerDiscovery } from '@libp2p/interface-peer-discovery'
import type { ConnectionGater, ConnectionProtector } from '@libp2p/interface-connection'
import type { Transport } from '@libp2p/interface-transport'
import type { StreamMuxerFactory } from '@libp2p/interface-stream-muxer'
import type { ConnectionEncrypter } from '@libp2p/interface-connection-encrypter'
import type { PeerRouting } from '@libp2p/interface-peer-routing'
import type { ContentRouting } from '@libp2p/interface-content-routing'
import type { PubSub } from '@libp2p/interface-pubsub'
import type { Metrics } from '@libp2p/interface-metrics'
import type { PeerInfo } from '@libp2p/interface-peer-info'
import type { PingServiceInit } from './ping/index.js'
import type { FetchServiceInit } from './fetch/index.js'
import type { Components } from './components.js'
import type { Libp2p } from '@libp2p/interface-libp2p'
import type { KeyChainInit } from './keychain/index.js'
import type { NatManagerInit } from './nat-manager.js'
import type { AddressManagerInit } from './address-manager/index.js'
import type { PeerRoutingInit } from './peer-routing.js'
import type { ConnectionManagerInit } from './connection-manager/index.js'

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
  addresses: AddressManagerInit

  /**
   * libp2p Connection Manager configuration
   */
  connectionManager: ConnectionManagerInit

  /**
   * A connection gater can deny new connections based on user criteria
   */
  connectionGater: Partial<ConnectionGater>

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
  peerStore: PeerStoreInit

  /**
   * libp2p Peer routing service configuration
   */
  peerRouting: PeerRoutingInit

  /**
   * keychain configuration
   */
  keychain: KeyChainInit

  /**
   * The NAT manager controls uPNP hole punching
   */
  nat: NatManagerInit

  /**
   * If configured as a relay this node will relay certain
   * types of traffic for other peers
   */
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

export type { Libp2p }

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
