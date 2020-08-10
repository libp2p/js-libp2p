'use strict'

const uint8ArrayEquals = require('uint8arrays/equals')
const Message = require('../../message')
const utils = require('../../utils')

module.exports = (dht) => {
  const log = utils.logger(dht.peerId, 'rpc:find-node')

  /**
   * Process `FindNode` DHT messages.
   *
   * @param {PeerId} peerId
   * @param {Message} msg
   * @returns {Promise<Message>}
   */
  return async function findNode (peerId, msg) {
    log('start')

    let closer
    if (uint8ArrayEquals(msg.key, dht.peerId.id)) {
      closer = [{
        id: dht.peerId
      }]
    } else {
      closer = await dht._betterPeersToQuery(msg, peerId)
    }

    const response = new Message(msg.type, new Uint8Array(0), msg.clusterLevel)

    if (closer.length > 0) {
      response.closerPeers = closer
    } else {
      log('handle FindNode %s: could not find anything', peerId.toB58String())
    }

    return response
  }
}
