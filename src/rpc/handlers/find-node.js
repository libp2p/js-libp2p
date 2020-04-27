'use strict'

const { Buffer } = require('buffer')
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
    if (msg.key.equals(dht.peerId.id)) {
      closer = [{
        id: dht.peerId
      }]
    } else {
      closer = await dht._betterPeersToQuery(msg, peerId)
    }

    const response = new Message(msg.type, Buffer.alloc(0), msg.clusterLevel)

    if (closer.length > 0) {
      response.closerPeers = closer
    } else {
      log('handle FindNode %s: could not find anything', peerId.toB58String())
    }

    return response
  }
}
