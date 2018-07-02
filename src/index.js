'use strict'

const PeerId = require('peer-id')
const PeerInfo = require('peer-info')
const multiaddr = require('multiaddr')
const mafmt = require('mafmt')
const EventEmitter = require('events').EventEmitter
const debug = require('debug')
const setImmediate = require('async/setImmediate')

const log = debug('libp2p:railing')
log.error = debug('libp2p:railing:error')

function isIPFS (addr) {
  try {
    return mafmt.IPFS.matches(addr)
  } catch (e) {
    return false
  }
}

class Bootstrap extends EventEmitter {
  constructor (options) {
    super()
    this._list = options.list
    this._interval = options.interval || 10000
    this._timer = null
  }

  start (callback) {
    setImmediate(() => callback())

    if (this._timer) { return }

    this._timer = setInterval(() => {
      this._list.forEach((candidate) => {
        if (!isIPFS(candidate)) { return log.error('Invalid multiaddr') }

        const ma = multiaddr(candidate)

        const peerId = PeerId.createFromB58String(ma.getPeerId())

        PeerInfo.create(peerId, (err, peerInfo) => {
          if (err) { return log.error('Invalid bootstrap peer id', err) }
          peerInfo.multiaddrs.add(ma)
          this.emit('peer', peerInfo)
        })
      })
    }, this._interval)
  }

  stop (callback) {
    setImmediate(callback)

    if (this._timer) {
      clearInterval(this._timer)
      this._timer = null
    }
  }
}

exports = module.exports = Bootstrap
exports.tag = 'bootstrap'
