'use strict'

const { Record } = require('libp2p-record')
const errcode = require('err-code')
const { Message } = require('../../message')
const {
  MAX_RECORD_AGE
} = require('../../constants')
const utils = require('../../utils')

const log = utils.logger('libp2p:kad-dht:rpc:handlers:get-value')

/**
 * @typedef {import('peer-id')} PeerId
 * @typedef {import('../types').DHTMessageHandler} DHTMessageHandler
 */

/**
 * @implements {DHTMessageHandler}
 */
class GetValueHandler {
  /**
   * @param {object} params
   * @param {PeerId} params.peerId
   * @param {import('../../types').PeerStore} params.peerStore
   * @param {import('../../peer-routing').PeerRouting} params.peerRouting
   * @param {import('interface-datastore').Datastore} params.datastore
   */
  constructor ({ peerId, peerStore, peerRouting, datastore }) {
    this._peerId = peerId
    this._peerStore = peerStore
    this._peerRouting = peerRouting
    this._datastore = datastore
  }

  /**
   * Process `GetValue` DHT messages.
   *
   * @param {PeerId} peerId
   * @param {Message} msg
   */
  async handle (peerId, msg) {
    const key = msg.key

    log('%p asked for key %b', peerId, key)

    if (!key || key.length === 0) {
      throw errcode(new Error('Invalid key'), 'ERR_INVALID_KEY')
    }

    const response = new Message(Message.TYPES.GET_VALUE, key, msg.clusterLevel)

    if (utils.isPublicKeyKey(key)) {
      log('is public key')
      const idFromKey = utils.fromPublicKeyKey(key)
      let id

      if (this._peerId.equals(idFromKey)) {
        id = this._peerId
      } else {
        const peerData = this._peerStore.get(idFromKey)
        id = peerData && peerData.id
      }

      if (id && id.pubKey) {
        log('returning found public key')
        response.record = new Record(key, id.pubKey.bytes)
        return response
      }
    }

    const [record, closer] = await Promise.all([
      this._checkLocalDatastore(key),
      this._peerRouting.getCloserPeersOffline(msg.key, peerId)
    ])

    if (record) {
      log('had record for %b in local datastore', key)
      response.record = record
    }

    if (closer.length > 0) {
      log('had %s closer peers in routing table', closer.length)
      response.closerPeers = closer
    }

    return response
  }

  /**
   * Try to fetch a given record by from the local datastore.
   * Returns the record iff it is still valid, meaning
   * - it was either authored by this node, or
   * - it was received less than `MAX_RECORD_AGE` ago.
   *
   * @param {Uint8Array} key
   */
  async _checkLocalDatastore (key) {
    log('checkLocalDatastore looking for %b', key)
    const dsKey = utils.bufferToKey(key)

    // Fetch value from ds
    let rawRecord
    try {
      rawRecord = await this._datastore.get(dsKey)
    } catch (/** @type {any} */ err) {
      if (err.code === 'ERR_NOT_FOUND') {
        return undefined
      }
      throw err
    }

    // Create record from the returned bytes
    const record = Record.deserialize(rawRecord)

    if (!record) {
      throw errcode(new Error('Invalid record'), 'ERR_INVALID_RECORD')
    }

    // Check validity: compare time received with max record age
    if (record.timeReceived == null ||
      Date.now() - record.timeReceived.getTime() > MAX_RECORD_AGE) {
      // If record is bad delete it and return
      await this._datastore.delete(dsKey)
      return undefined
    }

    // Record is valid
    return record
  }
}

module.exports.GetValueHandler = GetValueHandler
