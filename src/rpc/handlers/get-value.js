'use strict'

const { Record } = require('libp2p-record')

const errcode = require('err-code')

const Message = require('../../message')
const utils = require('../../utils')

/**
 * @typedef {import('peer-id')} PeerId
 */

/**
 * @param {import('../../index')} dht
 */
module.exports = (dht) => {
  const log = utils.logger(dht.peerId, 'rpc:get-value')

  /**
   * Process `GetValue` DHT messages.
   *
   * @param {PeerId} peerId
   * @param {Message} msg
   * @returns {Promise<Message>}
   */
  async function getValue (peerId, msg) {
    const key = msg.key

    log('key: %b', key)

    if (!key || key.length === 0) {
      throw errcode(new Error('Invalid key'), 'ERR_INVALID_KEY')
    }

    const response = new Message(Message.TYPES.GET_VALUE, key, msg.clusterLevel)

    if (utils.isPublicKeyKey(key)) {
      log('is public key')
      const idFromKey = utils.fromPublicKeyKey(key)
      let id

      if (dht._isSelf(idFromKey)) {
        id = dht.peerId
      } else {
        const peerData = dht.peerStore.get(idFromKey)
        id = peerData && peerData.id
      }

      if (id && id.pubKey) {
        log('returning found public key')
        response.record = new Record(key, id.pubKey.bytes)
        return response
      }
    }

    const [record, closer] = await Promise.all([
      dht._checkLocalDatastore(key),
      dht._betterPeersToQuery(msg, peerId)
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

  return getValue
}
