/**
 * @packageDocumentation
 *
 * A peer discover mechanism that uses [mDNS](https://datatracker.ietf.org/doc/html/rfc6762) to discover peers on the local network.
 *
 * @example
 *
 * ```ts
 * import { mdns } from '@libp2p/mdns'
 *
 * const options = {
 *   peerDiscovery: [
 *     mdns()
 *   ]
 * }
 *
 * const libp2p = await createLibp2p(options)
 *
 * libp2p.on('peer:discovery', function (peerId) {
 *   console.log('found peer: ', peerId.toB58String())
 * })
 *
 * await libp2p.start()
 * ```
 *
 * ## MDNS messages
 *
 * A query is sent to discover the libp2p nodes on the local network
 *
 * ```js
 * {
 *    type: 'query',
 *    questions: [ { name: '_p2p._udp.local', type: 'PTR' } ]
 * }
 * ```
 *
 * When a query is detected, each libp2p node sends an answer about itself
 *
 * ```js
 * [{
 *   name: '_p2p._udp.local',
 *   type: 'PTR',
 *   class: 'IN',
 *   ttl: 120,
 *   data: 'QmNPubsDWATVngE3d5WDSNe7eVrFLuk38qb9t6vdLnu2aK._p2p._udp.local'
 * }, {
 *   name: 'QmNPubsDWATVngE3d5WDSNe7eVrFLuk38qb9t6vdLnu2aK._p2p._udp.local',
 *   type: 'SRV',
 *   class: 'IN',
 *   ttl: 120,
 *   data: {
 *     priority: 10,
 *     weight: 1,
 *     port: '20002',
 *     target: 'LAPTOP-G5LJ7VN9'
 *   }
 * }, {
 *   name: 'QmNPubsDWATVngE3d5WDSNe7eVrFLuk38qb9t6vdLnu2aK._p2p._udp.local',
 *   type: 'TXT',
 *   class: 'IN',
 *   ttl: 120,
 *   data: ['QmNPubsDWATVngE3d5WDSNe7eVrFLuk38qb9t6vdLnu2aK']
 * }, {
 *   name: 'LAPTOP-G5LJ7VN9',
 *   type: 'A',
 *   class: 'IN',
 *   ttl: 120,
 *   data: '127.0.0.1'
 * }, {
 *   name: 'LAPTOP-G5LJ7VN9',
 *   type: 'AAAA',
 *   class: 'IN',
 *   ttl: 120,
 *   data: '::1'
 * }]
 * ```
 */

import { CustomEvent, TypedEventEmitter } from '@libp2p/interface/events'
import { peerDiscovery } from '@libp2p/interface/peer-discovery'
import { logger } from '@libp2p/logger'
import multicastDNS from 'multicast-dns'
import * as query from './query.js'
import { stringGen } from './utils.js'
import type { PeerDiscovery, PeerDiscoveryEvents } from '@libp2p/interface/peer-discovery'
import type { PeerInfo } from '@libp2p/interface/peer-info'
import type { Startable } from '@libp2p/interface/src/startable.js'
import type { AddressManager } from '@libp2p/interface-internal/address-manager'

const log = logger('libp2p:mdns')

export interface MulticastDNSInit {
  /**
   * (true/false) announce our presence through mDNS, default `true`
   */
  broadcast?: boolean

  /**
   * query interval, default 10 \* 1000 (10 seconds)
   */
  interval?: number

  /**
   * name of the service announce , default '_p2p._udp.local\`
   */
  serviceTag?: string
  /**
   * Peer name to announce (should not be peeer id), default random string
   */
  peerName?: string

  /**
   * UDP port to broadcast to
   */
  port?: number

  /**
   * UDP IP to broadcast to
   */
  ip?: string
}

export interface MulticastDNSComponents {
  addressManager: AddressManager
}

class MulticastDNS extends TypedEventEmitter<PeerDiscoveryEvents> implements PeerDiscovery, Startable {
  public mdns?: multicastDNS.MulticastDNS

  private readonly broadcast: boolean
  private readonly interval: number
  private readonly serviceTag: string
  private readonly peerName: string
  private readonly port: number
  private readonly ip: string
  private _queryInterval: ReturnType<typeof setInterval> | null
  private readonly components: MulticastDNSComponents

  constructor (components: MulticastDNSComponents, init: MulticastDNSInit = {}) {
    super()

    this.broadcast = init.broadcast !== false
    this.interval = init.interval ?? (1e3 * 10)
    this.serviceTag = init.serviceTag ?? '_p2p._udp.local'
    this.ip = init.ip ?? '224.0.0.251'
    this.peerName = init.peerName ?? stringGen(63)
    // 63 is dns label limit
    if (this.peerName.length >= 64) {
      throw new Error('Peer name should be less than 64 chars long')
    }
    this.port = init.port ?? 5353
    this.components = components
    this._queryInterval = null
    this._onMdnsQuery = this._onMdnsQuery.bind(this)
    this._onMdnsResponse = this._onMdnsResponse.bind(this)
    this._onMdnsWarning = this._onMdnsWarning.bind(this)
    this._onMdnsError = this._onMdnsError.bind(this)
  }

  readonly [peerDiscovery] = this

  readonly [Symbol.toStringTag] = '@libp2p/mdns'

  isStarted (): boolean {
    return Boolean(this.mdns)
  }

  /**
   * Start sending queries to the LAN.
   *
   * @returns {void}
   */
  async start (): Promise<void> {
    if (this.mdns != null) {
      return
    }

    this.mdns = multicastDNS({ port: this.port, ip: this.ip })
    this.mdns.on('query', this._onMdnsQuery)
    this.mdns.on('response', this._onMdnsResponse)
    this.mdns.on('warning', this._onMdnsWarning)
    this.mdns.on('error', this._onMdnsError)

    this._queryInterval = query.queryLAN(this.mdns, this.serviceTag, this.interval)
  }

  _onMdnsQuery (event: multicastDNS.QueryPacket): void {
    if (this.mdns == null) {
      return
    }

    log.trace('received incoming mDNS query')
    query.gotQuery(
      event,
      this.mdns,
      this.peerName,
      this.components.addressManager.getAddresses(),
      this.serviceTag,
      this.broadcast)
  }

  _onMdnsResponse (event: multicastDNS.ResponsePacket): void {
    log.trace('received mDNS query response')

    try {
      const foundPeer = query.gotResponse(event, this.peerName, this.serviceTag)

      if (foundPeer != null) {
        log('discovered peer in mDNS query response %p', foundPeer.id)

        this.dispatchEvent(new CustomEvent<PeerInfo>('peer', {
          detail: foundPeer
        }))
      }
    } catch (err) {
      log.error('Error processing peer response', err)
    }
  }

  _onMdnsWarning (err: Error): void {
    log.error('mdns warning', err)
  }

  _onMdnsError (err: Error): void {
    log.error('mdns error', err)
  }

  /**
   * Stop sending queries to the LAN.
   *
   * @returns {Promise}
   */
  async stop (): Promise<void> {
    if (this.mdns == null) {
      return
    }

    this.mdns.removeListener('query', this._onMdnsQuery)
    this.mdns.removeListener('response', this._onMdnsResponse)
    this.mdns.removeListener('warning', this._onMdnsWarning)
    this.mdns.removeListener('error', this._onMdnsError)

    if (this._queryInterval != null) {
      clearInterval(this._queryInterval)
      this._queryInterval = null
    }

    await new Promise<void>((resolve) => {
      if (this.mdns != null) {
        this.mdns.destroy(resolve)
      } else {
        resolve()
      }
    })

    this.mdns = undefined
  }
}

export function mdns (init: MulticastDNSInit = {}): (components: MulticastDNSComponents) => PeerDiscovery {
  return (components: MulticastDNSComponents) => new MulticastDNS(components, init)
}

/* for reference

   [ { name: '_p2p._udp.local',
       type: 'PTR',
       class: 1,
       ttl: 120,
       data: 'XQxZeAH6MX2n4255fzYmyUCUdhQ0DAWv.p2p._udp.local' },

     { name: 'XQxZeAH6MX2n4255fzYmyUCUdhQ0DAWv.p2p._udp.local',
       type: 'TXT',
       class: 1,
       ttl: 120,
       data: 'dnsaddr=/ip4/127.0.0.1/tcp/80/p2p/QmbBHw1Xx9pUpAbrVZUKTPL5Rsph5Q9GQhRvcWVBPFgGtC' },
]

*/
