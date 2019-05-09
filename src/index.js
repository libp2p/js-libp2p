'use strict'

const multicastDNS = require('multicast-dns')
const EventEmitter = require('events').EventEmitter
const assert = require('assert')
const nextTick = require('async/nextTick')
const parallel = require('async/parallel')
const debug = require('debug')
const log = debug('libp2p:mdns')
const query = require('./query')
const GoMulticastDNS = require('./compat')

class MulticastDNS extends EventEmitter {
  constructor (options) {
    super()
    assert(options.peerInfo, 'needs a PeerInfo to work')

    this.broadcast = options.broadcast !== false
    this.interval = options.interval || (1e3 * 10)
    this.serviceTag = options.serviceTag || 'ipfs.local'
    this.port = options.port || 5353
    this.peerInfo = options.peerInfo
    this._queryInterval = null
    this._onPeer = this._onPeer.bind(this)

    if (options.compat !== false) {
      this._goMdns = new GoMulticastDNS(options.peerInfo, {
        queryPeriod: options.compatQueryPeriod,
        queryInterval: options.compatQueryInterval
      })
      this._goMdns.on('peer', this._onPeer)
    }
  }

  start (callback) {
    const mdns = multicastDNS({ port: this.port })

    this.mdns = mdns

    this._queryInterval = query.queryLAN(this.mdns, this.serviceTag, this.interval)

    mdns.on('response', (event) => {
      query.gotResponse(event, this.peerInfo, this.serviceTag, (err, foundPeer) => {
        if (err) {
          return log('Error processing peer response', err)
        }

        this._onPeer(foundPeer)
      })
    })

    mdns.on('query', (event) => {
      query.gotQuery(event, this.mdns, this.peerInfo, this.serviceTag, this.broadcast)
    })

    if (this._goMdns) {
      this._goMdns.start(callback)
    } else {
      nextTick(() => callback())
    }
  }

  _onPeer (peerInfo) {
    this.emit('peer', peerInfo)
  }

  stop (callback) {
    if (!this.mdns) {
      return callback(new Error('MulticastDNS service had not started yet'))
    }

    clearInterval(this._queryInterval)
    this._queryInterval = null

    if (this._goMdns) {
      this._goMdns.removeListener('peer', this._onPeer)
      parallel([
        cb => this._goMdns.stop(cb),
        cb => this.mdns.destroy(cb)
      ], callback)
    } else {
      this.mdns.destroy(callback)
      this.mdns = undefined
    }
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
