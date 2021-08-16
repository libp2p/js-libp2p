'use strict'

const debug = require('debug')
const log = Object.assign(debug('libp2p:peer-store:proto-book'), {
  error: debug('libp2p:peer-store:proto-book:err')
})
const errcode = require('err-code')
const { equals: uint8ArrayEquals } = require('uint8arrays/equals')

const PeerId = require('peer-id')

const Book = require('./book')

const {
  codes: { ERR_INVALID_PARAMETERS }
} = require('../errors')

/**
 * @typedef {import('./')} PeerStore
 */

/**
 * @extends {Book}
 *
 * @fires MetadataBook#change:metadata
 */
class MetadataBook extends Book {
  /**
   * The MetadataBook is responsible for keeping the known supported
   * protocols of a peer.
   *
   * @class
   * @param {PeerStore} peerStore
   */
  constructor (peerStore) {
    /**
     * PeerStore Event emitter, used by the MetadataBook to emit:
     * "change:metadata" - emitted when the known metadata of a peer change.
     */
    super({
      peerStore,
      eventName: 'change:metadata',
      eventProperty: 'metadata'
    })

    /**
     * Map known peers to their known protocols.
     *
     * @type {Map<string, Map<string, Uint8Array>>}
     */
    this.data = new Map()
  }

  /**
   * Set metadata key and value of a provided peer.
   *
   * @override
   * @param {PeerId} peerId
   * @param {string} key - metadata key
   * @param {Uint8Array} value - metadata value
   * @returns {MetadataBook}
   */
  // @ts-ignore override with more then the parameters expected in Book
  set (peerId, key, value) {
    if (!PeerId.isPeerId(peerId)) {
      log.error('peerId must be an instance of peer-id to store data')
      throw errcode(new Error('peerId must be an instance of peer-id'), ERR_INVALID_PARAMETERS)
    }

    if (typeof key !== 'string' || !(value instanceof Uint8Array)) {
      log.error('valid key and value must be provided to store data')
      throw errcode(new Error('valid key and value must be provided'), ERR_INVALID_PARAMETERS)
    }

    this._setValue(peerId, key, value)

    return this
  }

  /**
   * Set data into the datastructure
   *
   * @override
   * @param {PeerId} peerId
   * @param {string} key
   * @param {Uint8Array} value
   */
  _setValue (peerId, key, value, { emit = true } = {}) {
    const id = peerId.toB58String()
    const rec = this.data.get(id) || new Map()
    const recMap = rec.get(key)

    // Already exists and is equal
    if (recMap && uint8ArrayEquals(value, recMap)) {
      log(`the metadata provided to store is equal to the already stored for ${id} on ${key}`)
      return
    }

    rec.set(key, value)
    this.data.set(id, rec)

    emit && this._emit(peerId, key)
  }

  /**
   * Get the known data of a provided peer.
   *
   * @param {PeerId} peerId
   * @returns {Map<string, Uint8Array>|undefined}
   */
  get (peerId) {
    if (!PeerId.isPeerId(peerId)) {
      throw errcode(new Error('peerId must be an instance of peer-id'), ERR_INVALID_PARAMETERS)
    }

    return this.data.get(peerId.toB58String())
  }

  /**
   * Get specific metadata value, if it exists
   *
   * @param {PeerId} peerId
   * @param {string} key
   * @returns {Uint8Array | undefined}
   */
  getValue (peerId, key) {
    if (!PeerId.isPeerId(peerId)) {
      throw errcode(new Error('peerId must be an instance of peer-id'), ERR_INVALID_PARAMETERS)
    }

    const rec = this.data.get(peerId.toB58String())
    return rec && rec.get(key)
  }

  /**
   * Deletes the provided peer from the book.
   *
   * @param {PeerId} peerId
   * @returns {boolean}
   */
  delete (peerId) {
    if (!PeerId.isPeerId(peerId)) {
      throw errcode(new Error('peerId must be an instance of peer-id'), ERR_INVALID_PARAMETERS)
    }

    if (!this.data.delete(peerId.toB58String())) {
      return false
    }

    this._emit(peerId)

    return true
  }

  /**
   * Deletes the provided peer metadata key from the book.
   *
   * @param {PeerId} peerId
   * @param {string} key
   * @returns {boolean}
   */
  deleteValue (peerId, key) {
    if (!PeerId.isPeerId(peerId)) {
      throw errcode(new Error('peerId must be an instance of peer-id'), ERR_INVALID_PARAMETERS)
    }

    const rec = this.data.get(peerId.toB58String())

    if (!rec || !rec.delete(key)) {
      return false
    }

    this._emit(peerId, key)

    return true
  }
}

module.exports = MetadataBook
