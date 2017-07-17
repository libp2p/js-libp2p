'use strict'

const utils = require('../../utils')

module.exports = (dht) => {
  const log = utils.logger(dht.peerInfo.id, 'rpc:ping')

  /**
   * Process `Ping` DHT messages.
   *
   * @param {PeerInfo} peer
   * @param {Message} msg
   * @param {function(Error, Message)} callback
   * @returns {undefined}
   */
  return function ping (peer, msg, callback) {
    log('from %s', peer.id.toB58String())
    callback(null, msg)
  }
}
