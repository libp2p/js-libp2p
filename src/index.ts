import multicastDNS from 'multicast-dns'
import { CustomEvent, EventEmitter } from '@libp2p/interfaces'
import { logger } from '@libp2p/logger'
import * as query from './query.js'
import { GoMulticastDNS } from './compat/index.js'
import type { PeerId } from '@libp2p/interfaces/peer-id'
import type { PeerDiscovery, PeerDiscoveryEvents } from '@libp2p/interfaces/peer-discovery'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { PeerData } from '@libp2p/interfaces/peer-data'

const log = logger('libp2p:mdns')

export interface MulticastDNSOptions {
  peerId: PeerId
  broadcast?: boolean
  interval?: number
  serviceTag?: string
  port?: number
  multiaddrs?: Multiaddr[]
  compat?: boolean
  compatQueryPeriod?: number
  compatQueryInterval?: number
}

export class MulticastDNS extends EventEmitter<PeerDiscoveryEvents> implements PeerDiscovery {
  static tag = 'mdns'

  public mdns?: multicastDNS.MulticastDNS

  private readonly broadcast: boolean
  private readonly interval: number
  private readonly serviceTag: string
  private readonly port: number
  private readonly peerId: PeerId
  private readonly peerMultiaddrs: Multiaddr[] // TODO: update this when multiaddrs change?
  private _queryInterval: NodeJS.Timer | null
  private readonly _goMdns?: GoMulticastDNS

  constructor (options: MulticastDNSOptions) {
    super()

    if (options.peerId == null) {
      throw new Error('needs own PeerId to work')
    }

    this.broadcast = options.broadcast !== false
    this.interval = options.interval ?? (1e3 * 10)
    this.serviceTag = options.serviceTag ?? 'ipfs.local'
    this.port = options.port ?? 5353
    this.peerId = options.peerId
    this.peerMultiaddrs = options.multiaddrs ?? []
    this._queryInterval = null
    this._onPeer = this._onPeer.bind(this)
    this._onMdnsQuery = this._onMdnsQuery.bind(this)
    this._onMdnsResponse = this._onMdnsResponse.bind(this)

    if (options.compat !== false) {
      this._goMdns = new GoMulticastDNS({
        multiaddrs: this.peerMultiaddrs,
        peerId: options.peerId,
        queryPeriod: options.compatQueryPeriod,
        queryInterval: options.compatQueryInterval
      })
      this._goMdns.addEventListener('peer', this._onPeer)
    }
  }

  isStarted () {
    return Boolean(this.mdns)
  }

  /**
   * Start sending queries to the LAN.
   *
   * @returns {void}
   */
  async start () {
    if (this.mdns != null) {
      return
    }

    this.mdns = multicastDNS({ port: this.port })
    this.mdns.on('query', this._onMdnsQuery)
    this.mdns.on('response', this._onMdnsResponse)

    this._queryInterval = query.queryLAN(this.mdns, this.serviceTag, this.interval)

    if (this._goMdns != null) {
      await this._goMdns.start()
    }
  }

  _onMdnsQuery (event: multicastDNS.QueryPacket) {
    if (this.mdns == null) {
      return
    }

    query.gotQuery(event, this.mdns, this.peerId, this.peerMultiaddrs, this.serviceTag, this.broadcast)
  }

  _onMdnsResponse (event: multicastDNS.ResponsePacket) {
    try {
      const foundPeer = query.gotResponse(event, this.peerId, this.serviceTag)

      if (foundPeer != null) {
        this.dispatchEvent(new CustomEvent('peer', {
          detail: foundPeer
        }))
      }
    } catch (err) {
      log('Error processing peer response', err)
    }
  }

  _onPeer (evt: CustomEvent<PeerData>) {
    if (this.mdns == null) {
      return
    }

    this.dispatchEvent(new CustomEvent('peer', {
      detail: evt.detail
    }))
  }

  /**
   * Stop sending queries to the LAN.
   *
   * @returns {Promise}
   */
  async stop () {
    if (this.mdns == null) {
      return
    }

    this.mdns.removeListener('query', this._onMdnsQuery)
    this.mdns.removeListener('response', this._onMdnsResponse)
    this._goMdns?.removeEventListener('peer', this._onPeer)

    if (this._queryInterval != null) {
      clearInterval(this._queryInterval)
      this._queryInterval = null
    }

    await Promise.all([
      this._goMdns?.stop(),
      new Promise<void>((resolve) => {
        if (this.mdns != null) {
          this.mdns.destroy(resolve)
        } else {
          resolve()
        }
      })
    ])

    this.mdns = undefined
  }
}

/* for reference

   [ { name: 'discovery.ipfs.io.local',
       type: 'PTR',
       class: 1,
       ttl: 120,
       data: 'QmbBHw1Xx9pUpAbrVZUKTPL5Rsph5Q9GQhRvcWVBPFgGtC.discovery.ipfs.io.local' },

     { name: 'QmbBHw1Xx9pUpAbrVZUKTPL5Rsph5Q9GQhRvcWVBPFgGtC.discovery.ipfs.io.local',
       type: 'SRV',
       class: 1,
       ttl: 120,
       data: { priority: 10, weight: 1, port: 4001, target: 'lorien.local' } },

     { name: 'lorien.local',
       type: 'A',
       class: 1,
       ttl: 120,
       data: '127.0.0.1' },

     { name: 'lorien.local',
       type: 'A',
       class: 1,
       ttl: 120,
       data: '127.94.0.1' },

     { name: 'lorien.local',
       type: 'A',
       class: 1,
       ttl: 120,
       data: '172.16.38.224' },

     { name: 'QmbBHw1Xx9pUpAbrVZUKTPL5Rsph5Q9GQhRvcWVBPFgGtC.discovery.ipfs.io.local',
       type: 'TXT',
       class: 1,
       ttl: 120,
       data: 'QmbBHw1Xx9pUpAbrVZUKTPL5Rsph5Q9GQhRvcWVBPFgGtC' } ],

*/
