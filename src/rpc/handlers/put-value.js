'use strict'

const utils = require('../../utils')
const errcode = require('err-code')
const Libp2pRecord = require('libp2p-record')
const log = utils.logger('libp2p:kad-dht:rpc:handlers:put-value')

/**
 * @typedef {import('peer-id')} PeerId
 * @typedef {import('../../message').Message} Message
 * @typedef {import('../types').DHTMessageHandler} DHTMessageHandler
 */

/**
 * @implements {DHTMessageHandler}
 */
class PutValueHandler {
  /**
   * @param {object} params
   * @param {import('libp2p-interfaces/src/types').DhtValidators} params.validators
   * @param {import('interface-datastore').Datastore} params.datastore
   */
  constructor ({ validators, datastore }) {
    this._validators = validators
    this._datastore = datastore
  }

  /**
   * Process `PutValue` DHT messages.
   *
   * @param {PeerId} peerId
   * @param {Message} msg
   */
  async handle (peerId, msg) {
    const key = msg.key
    log('%p asked to store value for key %b', peerId, key)

    const record = msg.record

    if (!record) {
      const errMsg = `Empty record from: ${peerId.toB58String()}`

      log.error(errMsg)
      throw errcode(new Error(errMsg), 'ERR_EMPTY_RECORD')
    }

    await Libp2pRecord.validator.verifyRecord(this._validators, record)

    record.timeReceived = new Date()
    const recordKey = utils.bufferToKey(record.key)
    await this._datastore.put(recordKey, record.serialize())

    return msg
  }
}

module.exports.PutValueHandler = PutValueHandler
