'use strict'

const Id = require('peer-id')
const Peer = require('peer-info')
const multiaddr = require('multiaddr')
const EventEmitter = require('events').EventEmitter
const util = require('util')
const debug = require('debug')

const log = debug('libp2p:railing')
log.error = debug('libp2p:railing:error')

exports = module.exports = Bootstrap

util.inherits(Bootstrap, EventEmitter)

function Bootstrap (peerList, options, swarm) {
  const self = this

  if (!(self instanceof Bootstrap)) {
    throw new Error('Must be instantiated with new')
  }

// to enable that the outside function to set the listeners on verify: false mode
  setImmediate(() => {
    peerList.forEach((peerCandidate) => {
      const mh = multiaddr(peerCandidate.split('/').splice(0, 5).join('/'))
      const peerId = Id.createFromB58String(peerCandidate.split('/').splice(6)[0])

      Peer.create(peerId, (err, peer) => {
        if (err) {
          return log.error('Error creating PeerInfo from bootstrap peer', err)
        }

        peer.multiaddr.add(mh)

        if (options && options.verify) {
          swarm.dial(peer, function (err) {
            if (err) {
              return
            }
            self.emit('peer', peer)
          })
        } else {
          self.emit('peer', peer)
        }
      })
    })
  })
}

module.exports = Bootstrap
