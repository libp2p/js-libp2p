'use strict'

const { Record } = require('libp2p-record')

const errcode = require('err-code')

const Message = require('../../message')
const utils = require('../../utils')

module.exports = (dht) => {
  const log = utils.logger(dht.peerInfo.id, 'rpc:get-value')

  /**
   * Process `GetValue` DHT messages.
   *
   * @param {PeerInfo} peer
   * @param {Message} msg
   * @returns {Promise<Message>}
   */
  return async function getValue (peer, msg) {
    const key = msg.key

    log('key: %b', key)

    if (!key || key.length === 0) {
      throw errcode(new Error('Invalid key'), 'ERR_INVALID_KEY')
    }

    const response = new Message(Message.TYPES.GET_VALUE, key, msg.clusterLevel)

    if (utils.isPublicKeyKey(key)) {
      log('is public key')
      const id = utils.fromPublicKeyKey(key)
      let info

      if (dht._isSelf(id)) {
        info = dht.peerInfo
      } else if (dht.peerStore.has(id)) {
        info = dht.peerStore.get(id)
      }

      if (info && info.id.pubKey) {
        log('returning found public key')
        response.record = new Record(key, info.id.pubKey.bytes)
        return response
      }
    }

    const [record, closer] = await Promise.all([
      dht._checkLocalDatastore(key),
      dht._betterPeersToQuery(msg, peer)
    ])

    if (record) {
      log('got record')
      response.record = record
    }

    if (closer.length > 0) {
      log('got closer %s', closer.length)
      response.closerPeers = closer
    }

    return response
  }
}
