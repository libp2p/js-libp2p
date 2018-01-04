'use strict'

const multicastDNS = require('multicast-dns')
const EventEmitter = require('events').EventEmitter
const debug = require('debug')
const log = debug('libp2p:mdns')
const query = require('./query')

class MulticastDNS extends EventEmitter {
  constructor (peerInfo, options) {
    super()
    options = options || {}

    this.broadcast = options.broadcast !== false
    this.interval = options.interval || (1e3 * 10)
    this.serviceTag = options.serviceTag || '_ipfs-discovery._udp'
    this.port = options.port || 5353
    this.peerInfo = peerInfo
    this._queryInterval = null
  }

  start (callback) {
    const self = this
    const mdns = multicastDNS({ port: this.port })

    this.mdns = mdns

    this._queryInterval = query.queryLAN(this.mdns, this.serviceTag, this.interval)

    mdns.on('response', (event) => {
      query.gotResponse(event, this.peerInfo, this.serviceTag, (err, foundPeer) => {
        if (err) {
          return log('Error processing peer response', err)
        }

        self.emit('peer', foundPeer)
      })
    })

    mdns.on('query', (event) => {
      query.gotQuery(event, this.mdns, this.peerInfo, this.serviceTag, this.broadcast)
    })

    setImmediate(() => callback())
  }

  stop (callback) {
    if (!this.mdns) {
      callback(new Error('MulticastDNS service had not started yet'))
    } else {
      clearInterval(this._queryInterval)
      this._queryInterval = null
      this.mdns.destroy(callback)
      this.mdns = undefined
    }
  }
}

module.exports = MulticastDNS

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
