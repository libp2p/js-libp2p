import multicastDNS from 'multicast-dns'
import { CustomEvent, EventEmitter } from '@libp2p/interfaces/events'
import { logger } from '@libp2p/logger'
import * as query from './query.js'
import { GoMulticastDNS } from './compat/index.js'
import type { PeerDiscovery, PeerDiscoveryEvents } from '@libp2p/interface-peer-discovery'
import type { PeerInfo } from '@libp2p/interface-peer-info'
import { symbol } from '@libp2p/interface-peer-discovery'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { AddressManager } from '@libp2p/interface-address-manager'

const log = logger('libp2p:mdns')

export interface MulticastDNSInit {
  broadcast?: boolean
  interval?: number
  serviceTag?: string
  port?: number
  ip?: string
  compat?: boolean
  compatQueryPeriod?: number
  compatQueryInterval?: number
}

export interface MulticastDNSComponents {
  peerId: PeerId
  addressManager: AddressManager
}

class MulticastDNS extends EventEmitter<PeerDiscoveryEvents> implements PeerDiscovery {
  public mdns?: multicastDNS.MulticastDNS

  private readonly broadcast: boolean
  private readonly interval: number
  private readonly serviceTag: string
  private readonly port: number
  private readonly ip: string
  private _queryInterval: ReturnType<typeof setInterval> | null
  private readonly _goMdns?: GoMulticastDNS
  private readonly components: MulticastDNSComponents

  constructor (components: MulticastDNSComponents, init: MulticastDNSInit = {}) {
    super()

    this.components = components
    this.broadcast = init.broadcast !== false
    this.interval = init.interval ?? (1e3 * 10)
    this.serviceTag = init.serviceTag ?? 'ipfs.local'
    this.ip = init.ip ?? '224.0.0.251'
    this.port = init.port ?? 5353
    this._queryInterval = null
    this._onPeer = this._onPeer.bind(this)
    this._onMdnsQuery = this._onMdnsQuery.bind(this)
    this._onMdnsResponse = this._onMdnsResponse.bind(this)

    if (init.compat !== false) {
      this._goMdns = new GoMulticastDNS(components, {
        queryPeriod: init.compatQueryPeriod,
        queryInterval: init.compatQueryInterval
      })
      this._goMdns.addEventListener('peer', this._onPeer)
    }
  }

  get [symbol] (): true {
    return true
  }

  get [Symbol.toStringTag] () {
    return '@libp2p/mdns'
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

    this.mdns = multicastDNS({ port: this.port, ip: this.ip })
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

    log.trace('received incoming mDNS query')
    query.gotQuery(event, this.mdns, this.components.peerId, this.components.addressManager.getAddresses(), this.serviceTag, this.broadcast)
  }

  _onMdnsResponse (event: multicastDNS.ResponsePacket) {
    log.trace('received mDNS query response')

    try {
      const foundPeer = query.gotResponse(event, this.components.peerId, this.serviceTag)

      if (foundPeer != null) {
        log('discovered peer in mDNS qeury response %p', foundPeer.id)

        this.dispatchEvent(new CustomEvent<PeerInfo>('peer', {
          detail: foundPeer
        }))
      }
    } catch (err) {
      log.error('Error processing peer response', err)
    }
  }

  _onPeer (evt: CustomEvent<PeerInfo>) {
    if (this.mdns == null) {
      return
    }

    this.dispatchEvent(new CustomEvent<PeerInfo>('peer', {
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

export function mdns (init: MulticastDNSInit = {}): (components: MulticastDNSComponents) => PeerDiscovery {
  return (components: MulticastDNSComponents) => new MulticastDNS(components, init)
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
