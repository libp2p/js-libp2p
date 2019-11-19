'use strict'

const Message = require('../../message')
const utils = require('../../utils')

module.exports = (dht) => {
  const log = utils.logger(dht.peerInfo.id, 'rpc:find-node')

  /**
   * Process `FindNode` DHT messages.
   *
   * @param {PeerInfo} peer
   * @param {Message} msg
   * @returns {Promise<Message>}
   */
  return async function findNode (peer, msg) {
    log('start')

    let closer
    if (msg.key.equals(dht.peerInfo.id.id)) {
      closer = [dht.peerInfo]
    } else {
      closer = await dht._betterPeersToQuery(msg, peer)
    }

    const response = new Message(msg.type, Buffer.alloc(0), msg.clusterLevel)

    if (closer.length > 0) {
      response.closerPeers = closer
    } else {
      log('handle FindNode %s: could not find anything', peer.id.toB58String())
    }

    return response
  }
}
