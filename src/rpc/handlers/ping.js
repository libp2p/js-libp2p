'use strict'

const utils = require('../../utils')

/**
 * @typedef {import('peer-id')} PeerId
 * @typedef {import('../../message')} Message
 */

/**
 * @param {import('../../index')} dht
 */
module.exports = (dht) => {
  const log = utils.logger(dht.peerId, 'rpc:ping')

  /**
   * Process `Ping` DHT messages.
   *
   * @param {PeerId} peerId
   * @param {Message} msg
   */
  function ping (peerId, msg) {
    log('from %s', peerId.toB58String())
    return msg
  }

  return ping
}
