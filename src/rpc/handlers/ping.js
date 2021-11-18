'use strict'

const utils = require('../../utils')
const log = utils.logger('libp2p:kad-dht:rpc:handlers:ping')

/**
 * @typedef {import('peer-id')} PeerId
 * @typedef {import('../../message').Message} Message
 * @typedef {import('../types').DHTMessageHandler} DHTMessageHandler
 */

/**
 * @implements {DHTMessageHandler}
 */
class PingHandler {
  /**
   * Process `Ping` DHT messages.
   *
   * @param {PeerId} peerId
   * @param {Message} msg
   */
  async handle (peerId, msg) {
    log(`ping from ${peerId}`)
    return msg
  }
}

module.exports.PingHandler = PingHandler
