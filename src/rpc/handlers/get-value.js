'use strict'

const parallel = require('async/parallel')
const Record = require('libp2p-record').Record

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
   * @param {function(Error, Message)} callback
   * @returns {undefined}
   */
  return function getValue (peer, msg, callback) {
    const key = msg.key

    log('key: %b', key)

    if (!key || key.length === 0) {
      return callback(errcode(new Error('Invalid key'), 'ERR_INVALID_KEY'))
    }

    const response = new Message(Message.TYPES.GET_VALUE, key, msg.clusterLevel)

    if (utils.isPublicKeyKey(key)) {
      log('is public key')
      const id = utils.fromPublicKeyKey(key)
      let info

      if (dht._isSelf(id)) {
        info = dht.peerInfo
      } else if (dht.peerBook.has(id)) {
        info = dht.peerBook.get(id)
      }

      if (info && info.id.pubKey) {
        log('returning found public key')
        response.record = new Record(key, info.id.pubKey.bytes)
        return callback(null, response)
      }
    }

    parallel([
      (cb) => dht._checkLocalDatastore(key, cb),
      (cb) => dht._betterPeersToQuery(msg, peer, cb)
    ], (err, res) => {
      if (err) {
        return callback(err)
      }

      const record = res[0]
      const closer = res[1]

      if (record) {
        log('got record')
        response.record = record
      }

      if (closer.length > 0) {
        log('got closer %s', closer.length)
        response.closerPeers = closer
      }

      callback(null, response)
    })
  }
}
