'use strict'

const waterfall = require('async/waterfall')

const Message = require('../../message')
const utils = require('../../utils')

module.exports = (dht) => {
  const log = utils.logger(dht.self.id, 'rpc:find-node')

  /**
   * Process `FindNode` DHT messages.
   *
   * @param {PeerInfo} peer
   * @param {Message} msg
   * @param {function(Error, Message)} callback
   * @returns {undefined}
   */
  return function findNode (peer, msg, callback) {
    log('start')

    waterfall([
      (cb) => {
        if (msg.key.equals(dht.self.id.id)) {
          return cb(null, [dht.self])
        }

        dht._betterPeersToQuery(msg, peer, cb)
      },
      (closer, cb) => {
        const response = new Message(msg.type, new Buffer(0), msg.clusterLevel)

        if (closer.length > 0) {
          response.closerPeers = closer
        } else {
          log('handle FindNode %s: could not find anything', peer.id.toB58String())
        }

        cb(null, response)
      }
    ], callback)
  }
}
