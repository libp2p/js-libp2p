/**
 * @packageDocumentation
 *
 * The configured bootstrap peers will be discovered after the configured timeout. This will ensure there are some peers in the peer store for the node to use to discover other peers.
 *
 * They will be tagged with a tag with the name `'bootstrap'` tag, the value `50` and it will expire after two minutes which means the nodes connections may be closed if the maximum number of connections is reached.
 *
 * Clients that need constant connections to bootstrap nodes (e.g. browsers) can set the TTL to `Infinity`.
 *
 * @example Configuring a list of bootstrap nodes
 *
 * ```TypeScript
 * import { createLibp2p } from 'libp2p'
 * import { bootstrap } from '@libp2p/bootstrap'
 *
 * const libp2p = await createLibp2p({
 *   peerDiscovery: [
 *     bootstrap({
 *       list: [
 *         // a list of bootstrap peer multiaddrs to connect to on node startup
 *         '/ip4/104.131.131.82/tcp/4001/ipfs/QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ',
 *         '/dnsaddr/bootstrap.libp2p.io/ipfs/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
 *         '/dnsaddr/bootstrap.libp2p.io/ipfs/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa'
 *       ]
 *     })
 *   ]
 * })
 *
 * libp2p.addEventListener('peer:discovery', (evt) => {
 *   console.log('found peer: ', evt.detail.toString())
 * })
 * ```
 */

import { peerDiscoverySymbol, serviceCapabilities } from '@libp2p/interface'
import { peerIdFromString } from '@libp2p/peer-id'
import { P2P } from '@multiformats/mafmt'
import { multiaddr } from '@multiformats/multiaddr'
import { TypedEventEmitter } from 'main-event'
import type { ComponentLogger, Logger, PeerDiscovery, PeerDiscoveryEvents, PeerInfo, PeerStore, Startable } from '@libp2p/interface'
import type { ConnectionManager } from '@libp2p/interface-internal'

const DEFAULT_BOOTSTRAP_TAG_NAME = 'bootstrap'
const DEFAULT_BOOTSTRAP_TAG_VALUE = 50
const DEFAULT_BOOTSTRAP_DISCOVERY_TIMEOUT = 1000

export interface BootstrapInit {
  /**
   * The list of peer addresses in multi-address format
   */
  list: string[]

  /**
   * How long to wait before discovering bootstrap nodes
   */
  timeout?: number

  /**
   * Tag a bootstrap peer with this name before "discovering" it
   *
   * @default 'bootstrap'
   */
  tagName?: string

  /**
   * The bootstrap peer tag will have this value
   *
   * @default 50
   */
  tagValue?: number

  /**
   * Cause the bootstrap peer tag to be removed after this number of ms
   */
  tagTTL?: number
}

export interface BootstrapComponents {
  peerStore: PeerStore
  logger: ComponentLogger
  connectionManager: ConnectionManager
}

/**
 * Emits 'peer' events on a regular interval for each peer in the provided list.
 */
class Bootstrap extends TypedEventEmitter<PeerDiscoveryEvents> implements PeerDiscovery, Startable {
  static tag = 'bootstrap'

  private readonly log: Logger
  private timer?: ReturnType<typeof setTimeout>
  private readonly list: PeerInfo[]
  private readonly timeout: number
  private readonly components: BootstrapComponents
  private readonly _init: BootstrapInit

  constructor (components: BootstrapComponents, options: BootstrapInit = { list: [] }) {
    if (options.list == null || options.list.length === 0) {
      throw new Error('Bootstrap requires a list of peer addresses')
    }
    super()

    this.components = components
    this.log = components.logger.forComponent('libp2p:bootstrap')
    this.timeout = options.timeout ?? DEFAULT_BOOTSTRAP_DISCOVERY_TIMEOUT
    this.list = []

    for (const candidate of options.list) {
      if (!P2P.matches(candidate)) {
        this.log.error('Invalid multiaddr')
        continue
      }

      const ma = multiaddr(candidate)
      const peerIdStr = ma.getPeerId()

      if (peerIdStr == null) {
        this.log.error('Invalid bootstrap multiaddr without peer id')
        continue
      }

      const peerData: PeerInfo = {
        id: peerIdFromString(peerIdStr),
        multiaddrs: [ma]
      }

      this.list.push(peerData)
    }

    this._init = options
  }

  readonly [peerDiscoverySymbol] = this

  readonly [Symbol.toStringTag] = '@libp2p/bootstrap'

  readonly [serviceCapabilities]: string[] = [
    '@libp2p/peer-discovery'
  ]

  isStarted (): boolean {
    return Boolean(this.timer)
  }

  /**
   * Start emitting events
   */
  start (): void {
    if (this.isStarted()) {
      return
    }

    this.log('Starting bootstrap node discovery, discovering peers after %s ms', this.timeout)
    this.timer = setTimeout(() => {
      void this._discoverBootstrapPeers()
        .catch(err => {
          this.log.error(err)
        })
    }, this.timeout)
  }

  /**
   * Emit each address in the list as a PeerInfo
   */
  async _discoverBootstrapPeers (): Promise<void> {
    if (this.timer == null) {
      return
    }

    for (const peerData of this.list) {
      await this.components.peerStore.merge(peerData.id, {
        tags: {
          [this._init.tagName ?? DEFAULT_BOOTSTRAP_TAG_NAME]: {
            value: this._init.tagValue ?? DEFAULT_BOOTSTRAP_TAG_VALUE,
            ttl: this._init.tagTTL
          }
        },
        multiaddrs: peerData.multiaddrs
      })

      // check we are still running
      if (this.timer == null) {
        return
      }

      this.safeDispatchEvent('peer', { detail: peerData })
      this.components.connectionManager.openConnection(peerData.id)
        .catch(err => {
          this.log.error('could not dial bootstrap peer %p', peerData.id, err)
        })
    }
  }

  /**
   * Stop emitting events
   */
  stop (): void {
    if (this.timer != null) {
      clearTimeout(this.timer)
    }

    this.timer = undefined
  }
}

export function bootstrap (init: BootstrapInit): (components: BootstrapComponents) => PeerDiscovery {
  return (components: BootstrapComponents) => new Bootstrap(components, init)
}
