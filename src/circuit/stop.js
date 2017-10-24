'use strict'

const setImmediate = require('async/setImmediate')

const EE = require('events').EventEmitter
const Connection = require('interface-connection').Connection
const utilsFactory = require('./utils')
const PeerInfo = require('peer-info')
const proto = require('../protocol')
const series = require('async/series')

const debug = require('debug')

const log = debug('libp2p:circuit:stop')
log.err = debug('libp2p:circuit:error:stop')

class Stop extends EE {
  constructor (swarm) {
    super()
    this.swarm = swarm
    this.utils = utilsFactory(swarm)
  }

  handle (message, streamHandler, callback) {
    callback = callback || (() => {})

    series([
      (cb) => this.utils.validateAddrs(message, streamHandler, proto.CircuitRelay.Type.STOP, cb),
      (cb) => this.utils.writeResponse(streamHandler, proto.CircuitRelay.Status.Success, cb)
    ], (err) => {
      if (err) {
        callback() // we don't return the error here, since multistream select don't expect one
        return log(err)
      }

      const peerInfo = new PeerInfo(message.srcPeer.id)
      message.srcPeer.addrs.forEach((addr) => peerInfo.multiaddrs.add(addr))
      const newConn = new Connection(streamHandler.rest())
      newConn.setPeerInfo(peerInfo)
      setImmediate(() => this.emit('connection', newConn))
      callback(newConn)
    })
  }
}

module.exports = Stop
