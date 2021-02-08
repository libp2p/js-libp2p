'use strict'

const utils = require('../../utils')
const errcode = require('err-code')

/**
 * @typedef {import('peer-id')} PeerId
 * @typedef {import('../../message')} Message
 */

/**
 * @param {import('../../index')} dht
 */
module.exports = (dht) => {
  const log = utils.logger(dht.peerId, 'rpc:put-value')

  /**
   * Process `PutValue` DHT messages.
   *
   * @param {PeerId} peerId
   * @param {Message} msg
   */
  async function putValue (peerId, msg) {
    const key = msg.key
    log('key: %b', key)

    const record = msg.record

    if (!record) {
      const errMsg = `Empty record from: ${peerId.toB58String()}`

      log.error(errMsg)
      throw errcode(new Error(errMsg), 'ERR_EMPTY_RECORD')
    }

    await dht._verifyRecordLocally(record)

    record.timeReceived = new Date()
    const recordKey = utils.bufferToKey(record.key)
    await dht.datastore.put(recordKey, record.serialize())

    dht.onPut(record, peerId)

    return msg
  }

  return putValue
}
