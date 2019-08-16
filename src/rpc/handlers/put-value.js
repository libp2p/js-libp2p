'use strict'

const utils = require('../../utils')
const errcode = require('err-code')
const promiseToCallback = require('promise-to-callback')

module.exports = (dht) => {
  const log = utils.logger(dht.peerInfo.id, 'rpc:put-value')

  /**
   * Process `PutValue` DHT messages.
   *
   * @param {PeerInfo} peer
   * @param {Message} msg
   * @param {function(Error, Message)} callback
   * @returns {undefined}
   */
  return function putValue (peer, msg, callback) {
    const key = msg.key
    log('key: %b', key)

    const record = msg.record

    if (!record) {
      const errMsg = `Empty record from: ${peer.id.toB58String()}`

      log.error(errMsg)
      return callback(errcode(new Error(errMsg), 'ERR_EMPTY_RECORD'))
    }

    dht._verifyRecordLocally(record, (err) => {
      if (err) {
        log.error(err.message)
        return callback(err)
      }

      record.timeReceived = new Date()

      const key = utils.bufferToKey(record.key)

      promiseToCallback(dht.datastore.put(key, record.serialize()))(err => {
        if (err) {
          return callback(err)
        }

        callback(null, msg)
      })
    })
  }
}
