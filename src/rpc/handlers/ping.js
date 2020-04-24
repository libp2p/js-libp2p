'use strict'

const utils = require('../../utils')

module.exports = (dht) => {
  const log = utils.logger(dht.peerId, 'rpc:ping')

  /**
   * Process `Ping` DHT messages.
   *
   * @param {PeerId} peerId
   * @param {Message} msg
   * @returns {Message}
   */
  return function ping (peerId, msg) {
    log('from %s', peerId.toB58String())
    return msg
  }
}
