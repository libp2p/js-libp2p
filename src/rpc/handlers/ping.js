'use strict'

const utils = require('../../utils')

module.exports = (dht) => {
  const log = utils.logger(dht.peerInfo.id, 'rpc:ping')

  /**
   * Process `Ping` DHT messages.
   *
   * @param {PeerInfo} peer
   * @param {Message} msg
   * @returns {Message}
   */
  return function ping (peer, msg) {
    log('from %s', peer.id.toB58String())
    return msg
  }
}
