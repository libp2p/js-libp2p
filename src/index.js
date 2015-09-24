var Id = require('peer-id')
var Peer = require('peer-info')
var multiaddr = require('multiaddr')
var EventEmitter = require('events').EventEmitter
var util = require('util')

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

      var p = new Peer(peerId, [mh])

      if (options && options.verify) {
        swarm.dial(p, {}, function (err) {
          if (err) {
            return
          }
          self.emit('peer', p)
        })
      } else {
        self.emit('peer', p)
      }
    })
  })
}
