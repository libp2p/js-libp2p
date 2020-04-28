'use strict'

const errcode = require('err-code')
const PeerId = require('peer-id')

const {
  codes: { ERR_INVALID_PARAMETERS }
} = require('../errors')

const passthrough = data => data

/**
 * The Book is the skeleton for the PeerStore books.
 */
class Book {
  /**
   * @constructor
   * @param {Object} properties
   * @param {PeerStore} properties.peerStore PeerStore instance.
   * @param {string} properties.eventName Name of the event to emit by the PeerStore.
   * @param {string} properties.eventProperty Name of the property to emit by the PeerStore.
   * @param {function} [properties.eventTransformer] Transformer function of the provided data for being emitted.
   */
  constructor ({ peerStore, eventName, eventProperty, eventTransformer = passthrough }) {
    this._ps = peerStore
    this.eventName = eventName
    this.eventProperty = eventProperty
    this.eventTransformer = eventTransformer

    /**
     * Map known peers to their data.
     * @type {Map<string, Array<Data>}
     */
    this.data = new Map()
  }

  /**
   * Set known data of a provided peer.
   * @param {PeerId} peerId
   * @param {Array<Data>|Data} data
   */
  set (peerId, data) {
    throw errcode(new Error('set must be implemented by the subclass'), 'ERR_NOT_IMPLEMENTED')
  }

  /**
   * Set data into the datastructure, persistence and emit it using the provided transformers.
   * @private
   * @param {PeerId} peerId peerId of the data to store
   * @param {*} data data to store.
   * @param {Object} [options] storing options.
   * @param {boolean} [options.emit = true] emit the provided data.
   * @return {void}
   */
  _setData (peerId, data, { emit = true } = {}) {
    const b58key = peerId.toB58String()

    // Store data in memory
    this.data.set(b58key, data)

    // Store PeerId
    if (!PeerId.isPeerId(data)) {
      this._ps.keyBook.set(peerId)
    }

    // Emit event
    emit && this._emit(peerId, data)
  }

  /**
   * Emit data.
   * @private
   * @param {PeerId} peerId
   * @param {*} data
   */
  _emit (peerId, data) {
    this._ps.emit(this.eventName, {
      peerId,
      [this.eventProperty]: this.eventTransformer(data)
    })
  }

  /**
   * Get the known data of a provided peer.
   * @param {PeerId} peerId
   * @returns {Array<Data>}
   */
  get (peerId) {
    if (!PeerId.isPeerId(peerId)) {
      throw errcode(new Error('peerId must be an instance of peer-id'), ERR_INVALID_PARAMETERS)
    }

    const rec = this.data.get(peerId.toB58String())

    return rec ? [...rec] : undefined
  }

  /**
   * Deletes the provided peer from the book.
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

    this._emit(peerId, [])

    return true
  }
}

module.exports = Book
