import { PeerId } from '@libp2p/peer-id'
import { Multiaddr } from '@multiformats/multiaddr'
import { P2P } from '@multiformats/mafmt'
import { EventEmitter } from 'events'
import debug from 'debug'
import type PeerDiscovery from '@libp2p/interfaces/peer-discovery'
import type { PeerData } from '@libp2p/interfaces/peer-data'

const log = Object.assign(debug('libp2p:bootstrap'), {
  error: debug('libp2p:bootstrap:error')
})

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
export class Bootstrap extends EventEmitter implements PeerDiscovery {
  static tag = 'bootstrap'

  private timer?: NodeJS.Timer
  private readonly list: PeerData[]
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

      const ma = new Multiaddr(candidate)
      const peerIdStr = ma.getPeerId()

      if (peerIdStr == null) {
        log.error('Invalid bootstrap multiaddr without peer id')
        continue
      }

      const peerData: PeerData = {
        id: PeerId.fromString(peerIdStr),
        multiaddrs: [ma],
        protocols: []
      }

      this.list.push(peerData)
    }
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
      this.emit('peer', peerData)
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
