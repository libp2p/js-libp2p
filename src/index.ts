import { multiaddr } from '@multiformats/multiaddr'
import { P2P } from '@multiformats/mafmt'
import { CustomEvent, EventEmitter } from '@libp2p/interfaces/events'
import { logger } from '@libp2p/logger'
import type { PeerDiscovery, PeerDiscoveryEvents } from '@libp2p/interface-peer-discovery'
import type { PeerInfo } from '@libp2p/interface-peer-info'
import { peerIdFromString } from '@libp2p/peer-id'
import { symbol } from '@libp2p/interface-peer-discovery'
import { Components, Initializable } from '@libp2p/components'

const log = logger('libp2p:bootstrap')

const DEFAULT_BOOTSTRAP_TAG_NAME = 'bootstrap'
const DEFAULT_BOOTSTRAP_TAG_VALUE = 50
const DEFAULT_BOOTSTRAP_TAG_TTL = 120000
const DEFAULT_BOOTSTRAP_DISCOVERY_TIMEOUT = 1000

export interface BootstrapOptions {
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

/**
 * Emits 'peer' events on a regular interval for each peer in the provided list.
 */
export class Bootstrap extends EventEmitter<PeerDiscoveryEvents> implements PeerDiscovery, Initializable {
  static tag = 'bootstrap'

  private timer?: ReturnType<typeof setTimeout>
  private readonly list: PeerInfo[]
  private readonly timeout: number
  private components: Components = new Components()
  private readonly _init: BootstrapOptions

  constructor (options: BootstrapOptions = { list: [] }) {
    if (options.list == null || options.list.length === 0) {
      throw new Error('Bootstrap requires a list of peer addresses')
    }
    super()

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

  init (components: Components) {
    this.components = components
  }

  get [symbol] (): true {
    return true
  }

  get [Symbol.toStringTag] () {
    return '@libp2p/bootstrap'
  }

  isStarted () {
    return Boolean(this.timer)
  }

  /**
   * Start emitting events
   */
  start () {
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
  async _discoverBootstrapPeers () {
    if (this.timer == null) {
      return
    }

    for (const peerData of this.list) {
      await this.components.getPeerStore().tagPeer(peerData.id, this._init.tagName ?? DEFAULT_BOOTSTRAP_TAG_NAME, {
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
  stop () {
    if (this.timer != null) {
      clearTimeout(this.timer)
    }

    this.timer = undefined
  }
}
