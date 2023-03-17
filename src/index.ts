import { multiaddr } from '@multiformats/multiaddr'
import { P2P } from '@multiformats/mafmt'
import { CustomEvent, EventEmitter } from '@libp2p/interfaces/events'
import { logger } from '@libp2p/logger'
import type { PeerDiscovery, PeerDiscoveryEvents } from '@libp2p/interface-peer-discovery'
import type { PeerInfo } from '@libp2p/interface-peer-info'
import { peerIdFromString } from '@libp2p/peer-id'
import { symbol } from '@libp2p/interface-peer-discovery'
import type { Startable } from '@libp2p/interfaces/dist/src/startable'
import type { PeerStore } from '@libp2p/interface-peer-store'

const log = logger('libp2p:bootstrap')

const DEFAULT_BOOTSTRAP_TAG_NAME = 'bootstrap'
const DEFAULT_BOOTSTRAP_TAG_VALUE = 50
const DEFAULT_BOOTSTRAP_TAG_TTL = 120000
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
   * Tag a bootstrap peer with this name before "discovering" it (default: 'bootstrap')
   */
  tagName?: string

  /**
   * The bootstrap peer tag will have this value (default: 50)
   */
  tagValue?: number

  /**
   * Cause the bootstrap peer tag to be removed after this number of ms (default: 2 minutes)
   */
  tagTTL?: number
}

export interface BootstrapComponents {
  peerStore: PeerStore
}

/**
 * Emits 'peer' events on a regular interval for each peer in the provided list.
 */
class Bootstrap extends EventEmitter<PeerDiscoveryEvents> implements PeerDiscovery, Startable {
  static tag = 'bootstrap'

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
    this.timeout = options.timeout ?? DEFAULT_BOOTSTRAP_DISCOVERY_TIMEOUT
    this.list = []

    for (const candidate of options.list) {
      if (!P2P.matches(candidate)) {
        log.error('Invalid multiaddr')
        continue
      }

      const ma = multiaddr(candidate)
      const peerIdStr = ma.getPeerId()

      if (peerIdStr == null) {
        log.error('Invalid bootstrap multiaddr without peer id')
        continue
      }

      const peerData: PeerInfo = {
        id: peerIdFromString(peerIdStr),
        multiaddrs: [ma],
        protocols: []
      }

      this.list.push(peerData)
    }

    this._init = options
  }

  get [symbol] (): true {
    return true
  }

  get [Symbol.toStringTag] (): '@libp2p/bootstrap' {
    return '@libp2p/bootstrap'
  }

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

    log('Starting bootstrap node discovery, discovering peers after %s ms', this.timeout)
    this.timer = setTimeout(() => {
      void this._discoverBootstrapPeers()
        .catch(err => {
          log.error(err)
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
      await this.components.peerStore.tagPeer(peerData.id, this._init.tagName ?? DEFAULT_BOOTSTRAP_TAG_NAME, {
        value: this._init.tagValue ?? DEFAULT_BOOTSTRAP_TAG_VALUE,
        ttl: this._init.tagTTL ?? DEFAULT_BOOTSTRAP_TAG_TTL
      })

      // check we are still running
      if (this.timer == null) {
        return
      }

      this.dispatchEvent(new CustomEvent<PeerInfo>('peer', { detail: peerData }))
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
