'use strict'

const errcode = require('err-code')
const PeerId = require('peer-id')

const {
  codes: { ERR_INVALID_PARAMETERS }
} = require('../errors')

/**
 * @param {any} data
 */
const passthrough = data => data

/**
 * @typedef {import('./')} PeerStore
 */

class Book {
  /**
   * The Book is the skeleton for the PeerStore books.
   *
   * @class
   * @param {Object} properties
   * @param {PeerStore} properties.peerStore - PeerStore instance.
   * @param {string} properties.eventName - Name of the event to emit by the PeerStore.
   * @param {string} properties.eventProperty - Name of the property to emit by the PeerStore.
   * @param {(data: any) => any[]} [properties.eventTransformer] - Transformer function of the provided data for being emitted.
   */
  constructor ({ peerStore, eventName, eventProperty, eventTransformer = passthrough }) {
    this._ps = peerStore
    this.eventName = eventName
    this.eventProperty = eventProperty
    this.eventTransformer = eventTransformer

    /**
     * Map known peers to their data.
     *
     * @type {Map<string, any[]|any>}
     */
    this.data = new Map()
  }

  /**
   * Set known data of a provided peer.
   *
   * @param {PeerId} peerId
   * @param {any[]|any} data
   */
  set (peerId, data) {
    throw errcode(new Error('set must be implemented by the subclass'), 'ERR_NOT_IMPLEMENTED')
  }

  /**
   * Set data into the datastructure, persistence and emit it using the provided transformers.
   *
   * @protected
   * @param {PeerId} peerId - peerId of the data to store
   * @param {any} data - data to store.
   * @param {Object} [options] - storing options.
   * @param {boolean} [options.emit = true] - emit the provided data.
   * @returns {void}
   */
  _setData (peerId, data, { emit = true } = {}) {
    const b58key = peerId.toB58String()

    // Store data in memory
    this.data.set(b58key, data)

    // Emit event
    emit && this._emit(peerId, data)
  }

  /**
   * Emit data.
   *
   * @protected
   * @param {PeerId} peerId
   * @param {any} [data]
   */
  _emit (peerId, data) {
    this._ps.emit(this.eventName, {
      peerId,
      [this.eventProperty]: this.eventTransformer(data)
    })
  }

  /**
   * Get the known data of a provided peer.
   * Returns `undefined` if there is no available data for the given peer.
   *
   * @param {PeerId} peerId
   * @returns {any[]|any|undefined}
   */
  get (peerId) {
    if (!PeerId.isPeerId(peerId)) {
      throw errcode(new Error('peerId must be an instance of peer-id'), ERR_INVALID_PARAMETERS)
    }

    const rec = this.data.get(peerId.toB58String())

    // @ts-ignore
    return rec ? [...rec] : undefined
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

    this._emit(peerId, [])

    return true
  }
}

module.exports = Book
