'use strict'

const PeerId = require('peer-id')
const PeerInfo = require('peer-info')
const multiaddr = require('multiaddr')
const EventEmitter = require('events').EventEmitter
const debug = require('debug')

const log = debug('libp2p:railing')
log.error = debug('libp2p:railing:error')

class Railing extends EventEmitter {
  constructor (bootstrapers) {
    super()
    this.bootstrapers = bootstrapers
  }

  start (callback) {
    setImmediate(callback)
    setImmediate(() => {
      this.bootstrapers.forEach((candidate) => {
        // TODO: It would be awesome to get better tools at extracting things
        // from multiaddr
        const split = candidate.split('/')

        const ma = multiaddr(split.splice(0, 5).join('/'))

        const peerIdB58Str = split[1]
        const peerId = PeerId.createFromB58String(peerIdB58Str)

        PeerInfo.create(peerId, (err, peerInfo) => {
          if (err) {
            return log.error('Error creating PeerInfo from bootstrap peer', err)
          }

          peerInfo.multiaddr.add(ma)

          this.emit('peer', peerInfo)
        })
      })
    })
  }

  stop (callback) {
    setImmediate(callback)
  }
}

module.exports = Railing
