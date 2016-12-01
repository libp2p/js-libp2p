'use strict'

var Id = require('peer-id')
var Peer = require('peer-info')
var multiaddr = require('multiaddr')
var EventEmitter = require('events').EventEmitter
var util = require('util')
var debug = require('debug')

var log = debug('libp2p:railing')
log.error = debug('libp2p:railing:error')

exports = module.exports = Bootstrap
exports.default = require('./default.json')

util.inherits(Bootstrap, EventEmitter)

function Bootstrap (peerList, options, swarm) {
  var self = this

  if (!(self instanceof Bootstrap)) {
    throw new Error('Must be instantiated with new')
  }

  setImmediate(function () { // to enable that the outside function to set the listeners on verify: false mode
    peerList.forEach(function (peerCandidate) {
      var mh = multiaddr(peerCandidate.split('/').splice(0, 5).join('/'))
      var peerId = Id.createFromB58String(peerCandidate.split('/').splice(6)[0])

      Peer.create(peerId, function (err, peer) {
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
