'use strict'

const setImmediate = require('async/setImmediate')

const EE = require('events').EventEmitter
const Connection = require('interface-connection').Connection
const utilsFactory = require('./utils')
const PeerInfo = require('peer-info')
const PeerId = require('peer-id')
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

  /**
   * Handle the incoming STOP message
   *
   * @param {{}} msg  - the parsed protobuf message
   * @param {StreamHandler} sh  - the stream handler wrapped connection
   * @param {Function} callback  - callback
   * @returns {undefined}
   */
  handle (msg, sh, callback) {
    callback = callback || (() => {})

    series([
      (cb) => this.utils.validateAddrs(
        msg,
        sh,
        proto.CircuitRelay.Type.STOP,
        cb),
      (cb) => this.utils.writeResponse(
        sh,
        proto.CircuitRelay.Status.Success,
        cb)
    ], (err) => {
      if (err) {
        // we don't return the error here,
        // since multistream select don't expect one
        callback()
        return log(err)
      }

      const peerInfo = new PeerInfo(peerIdFromId(msg.srcPeer.id))
      msg.srcPeer.addrs.forEach((addr) => peerInfo.multiaddrs.add(addr))
      const newConn = new Connection(sh.rest())
      newConn.setPeerInfo(peerInfo)
      setImmediate(() => this.emit('connection', newConn))
      callback(newConn)
    })
  }
}

module.exports = Stop

function peerIdFromId (id) {
  if (typeof id === 'string') {
    return PeerId.createFromB58String(id)
  }

  return PeerId.createFromBytes(id)
}
