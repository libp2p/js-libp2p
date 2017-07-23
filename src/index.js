'use strict'

const PeerId = require('peer-id')
const PeerInfo = require('peer-info')
const multiaddr = require('multiaddr')
const EventEmitter = require('events').EventEmitter
const debug = require('debug')
const setImmediate = require('async/setImmediate')

const log = debug('libp2p:railing')
log.error = debug('libp2p:railing:error')

class Railing extends EventEmitter {
  constructor (bootstrapers) {
    super()
    this.bootstrapers = bootstrapers
    this.interval = null
  }

  start (callback) {
    setImmediate(() => callback())
    if (this.interval) { return }

    this.interval = setInterval(() => {
      this.bootstrapers.forEach((candidate) => {
        const ma = multiaddr(candidate)

        const peerId = PeerId.createFromB58String(ma.getPeerId())

        PeerInfo.create(peerId, (err, peerInfo) => {
          if (err) { return log.error('Invalid bootstrap peer id', err) }

          peerInfo.multiaddrs.add(ma)

          this.emit('peer', peerInfo)
        })
      })
    }, 10000)
  }

  stop (callback) {
    setImmediate(callback)
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
  }
}

module.exports = Railing
