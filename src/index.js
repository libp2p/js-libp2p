'use strict'

const multicastDNS = require('multicast-dns')
const { EventEmitter } = require('events')
const debug = require('debug')
const log = debug('libp2p:mdns')
const query = require('./query')
const GoMulticastDNS = require('./compat')

class MulticastDNS extends EventEmitter {
  constructor (options = {}) {
    super()

    if (!options.peerId) {
      throw new Error('needs own PeerId to work')
    }

    this.broadcast = options.broadcast !== false
    this.interval = options.interval || (1e3 * 10)
    this.serviceTag = options.serviceTag || 'ipfs.local'
    this.port = options.port || 5353
    this.peerId = options.peerId
    this.peerMultiaddrs = options.libp2p.multiaddrs || []
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
      this._goMdns.on('peer', this._onPeer)
    }
  }

  /**
   * Start sending queries to the LAN.
   *
   * @returns {void}
   */
  async start () {
    if (this.mdns) return

    this.mdns = multicastDNS({ port: this.port })
    this.mdns.on('query', this._onMdnsQuery)
    this.mdns.on('response', this._onMdnsResponse)

    this._queryInterval = query.queryLAN(this.mdns, this.serviceTag, this.interval)

    if (this._goMdns) {
      await this._goMdns.start()
    }
  }

  _onMdnsQuery (event) {
    query.gotQuery(event, this.mdns, this.peerId, this.peerMultiaddrs, this.serviceTag, this.broadcast)
  }

  _onMdnsResponse (event) {
    try {
      const foundPeer = query.gotResponse(event, this.peerId, this.serviceTag)

      if (foundPeer) {
        this.emit('peer', foundPeer)
      }
    } catch (err) {
      log('Error processing peer response', err)
    }
  }

  _onPeer (peerData) {
    this.mdns && this.emit('peer', peerData)
  }

  /**
   * Stop sending queries to the LAN.
   *
   * @returns {Promise}
   */
  async stop () {
    if (!this.mdns) {
      return
    }

    this.mdns.removeListener('query', this._onMdnsQuery)
    this.mdns.removeListener('response', this._onMdnsResponse)
    this._goMdns && this._goMdns.removeListener('peer', this._onPeer)

    clearInterval(this._queryInterval)
    this._queryInterval = null

    await Promise.all([
      this._goMdns && this._goMdns.stop(),
      new Promise((resolve) => this.mdns.destroy(resolve))
    ])

    this.mdns = undefined
  }
}

exports = module.exports = MulticastDNS
exports.tag = 'mdns'

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
