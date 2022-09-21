import { multiaddr } from '@multiformats/multiaddr'
import { P2P } from '@multiformats/mafmt'
import { CustomEvent, EventEmitter } from '@libp2p/interfaces/events'
import { logger } from '@libp2p/logger'
import type { PeerDiscovery, PeerDiscoveryEvents } from '@libp2p/interface-peer-discovery'
import type { PeerInfo } from '@libp2p/interface-peer-info'
import { peerIdFromString } from '@libp2p/peer-id'
import { symbol } from '@libp2p/interface-peer-discovery'

const log = logger('libp2p:bootstrap')

export interface BootstrapOptions {
  /**
   * The list of peer addresses in multi-address format
   */
  list: string[]

  /**
   * The interval between emitting addresses in milliseconds
   */
  interval?: number
}

/**
 * Emits 'peer' events on a regular interval for each peer in the provided list.
 */
export class Bootstrap extends EventEmitter<PeerDiscoveryEvents> implements PeerDiscovery {
  static tag = 'bootstrap'

  private timer?: ReturnType<typeof setInterval>
  private readonly list: PeerInfo[]
  private readonly interval: number

  constructor (options: BootstrapOptions = { list: [] }) {
    if (options.list == null || options.list.length === 0) {
      throw new Error('Bootstrap requires a list of peer addresses')
    }
    super()

    this.interval = options.interval ?? 10000
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
    if (this.timer != null) {
      return
    }

    this.timer = setInterval(() => this._discoverBootstrapPeers(), this.interval)
    log('Starting bootstrap node discovery')
    this._discoverBootstrapPeers()
  }

  /**
   * Emit each address in the list as a PeerInfo
   */
  _discoverBootstrapPeers () {
    if (this.timer == null) {
      return
    }

    this.list.forEach((peerData) => {
      this.dispatchEvent(new CustomEvent<PeerInfo>('peer', { detail: peerData }))
    })
  }

  /**
   * Stop emitting events
   */
  stop () {
    if (this.timer != null) {
      clearInterval(this.timer)
    }

    this.timer = undefined
  }
}
