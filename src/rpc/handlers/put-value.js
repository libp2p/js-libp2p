'use strict'

const utils = require('../../utils')
const errcode = require('err-code')

module.exports = (dht) => {
  const log = utils.logger(dht.peerInfo.id, 'rpc:put-value')

  /**
   * Process `PutValue` DHT messages.
   *
   * @param {PeerInfo} peer
   * @param {Message} msg
   * @returns {Promise<Message>}
   */
  return async function putValue (peer, msg) {
    const key = msg.key
    log('key: %b', key)

    const record = msg.record

    if (!record) {
      const errMsg = `Empty record from: ${peer.id.toB58String()}`

      log.error(errMsg)
      throw errcode(new Error(errMsg), 'ERR_EMPTY_RECORD')
    }

    await dht._verifyRecordLocally(record)

    record.timeReceived = new Date()
    const recordKey = utils.bufferToKey(record.key)
    await dht.datastore.put(recordKey, record.serialize())

    return msg
  }
}
