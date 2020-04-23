'use strict'

const errcode = require('err-code')
const debug = require('debug')
const log = debug('libp2p:peer-store:book')
log.error = debug('libp2p:peer-store:book:error')

const { Key } = require('interface-datastore')
const PeerId = require('peer-id')

const {
  codes: { ERR_INVALID_PARAMETERS }
} = require('../errors')

const passthrough = data => data

/**
 * The Book is the skeleton for the PeerStore books.
 * It handles the PeerStore persistence and events.
 */
class Book {
  /**
   * @constructor
   * @param {Object} properties
   * @param {PeerStore} properties.peerStore PeerStore instance.
   * @param {string} properties.eventName Name of the event to emit by the PeerStore.
   * @param {string} properties.eventProperty Name of the property to emit by the PeerStore.
   * @param {Object} properties.protoBuf Suffix of the Datastore Key
   * @param {String} properties.dsPrefix Prefix of the Datastore Key
   * @param {String} [properties.dsSuffix] Suffix of the Datastore Key
   * @param {function} [properties.eventTransformer] Transformer function of the provided data for being emitted.
   * @param {function} [properties.dsSetTransformer] Transformer function of the provided data for being persisted.
   * @param {function} [properties.dsGetTransformer] Transformer function of the persisted data to be loaded.
   */
  constructor ({
    peerStore,
    eventName,
    eventProperty,
    protoBuf,
    dsPrefix,
    dsSuffix = '',
    eventTransformer = passthrough,
    dsSetTransformer = passthrough,
    dsGetTransformer = passthrough
  }) {
    this._ps = peerStore
    this.eventName = eventName
    this.eventProperty = eventProperty
    this.protoBuf = protoBuf
    this.dsPrefix = dsPrefix
    this.dsSuffix = dsSuffix
    this.eventTransformer = eventTransformer
    this.dsSetTransformer = dsSetTransformer
    this.dsGetTransformer = dsGetTransformer

    /**
     * Map known peers to their data.
     * @type {Map<string, Array<Data>}
     */
    this.data = new Map()
  }

  /**
   * Load data from peerStore datastore into the books datastructures.
   * This will not persist the replicated data nor emit modify events.
   * @private
   * @return {Promise<void>}
   */
  async _loadData () {
    if (!this._ps._datastore || !this._ps._enabledPersistance) {
      return
    }

    const persistenceQuery = {
      prefix: this.dsPrefix
    }

    for await (const { key, value } of this._ps._datastore.query(persistenceQuery)) {
      try {
        // PeerId to add to the book
        const b32key = key.toString()
          .replace(this.dsPrefix, '') // remove prefix from key
          .replace(this.dsSuffix, '') // remove suffix from key
        const peerId = PeerId.createFromCID(b32key)
        // Data in the format to add to the book
        const data = this.dsGetTransformer(this.protoBuf.decode(value))
        // Add the book without persist the replicated data and emit modify
        this._setData(peerId, data, {
          persist: false,
          emit: false
        })
      } catch (err) {
        log.error(err)
      }
    }
  }

  /**
   * Set data into the datastructure, persistence and emit it using the provided transformers.
   * @private
   * @param {PeerId} peerId peerId of the data to store
   * @param {Array<*>} data data to store.
   * @param {Object} [options] storing options.
   * @param {boolean} [options.persist = true] persist the provided data.
   * @param {boolean} [options.emit = true] emit the provided data.
   * @return {Promise<void>}
   */
  async _setData (peerId, data, { persist = true, emit = true } = {}) {
    const b58key = peerId.toB58String()

    // Store data in memory
    this.data.set(b58key, data)
    this._setPeerId(peerId)

    // Emit event
    emit && this._ps.emit(this.eventName, {
      peerId,
      [this.eventProperty]: this.eventTransformer(data)
    })

    // Add to Persistence datastore
    persist && await this._persistData(peerId, data)
  }

  /**
   * Persist data on the datastore
   * @private
   * @param {PeerId} peerId peerId of the data to persist
   * @param {Array<*>} data data to persist
   * @return {Promise<void>}
   */
  async _persistData (peerId, data) {
    if (!this._ps._datastore || !this._ps._enabledPersistance) {
      return
    }

    const b32key = peerId.toString()
    const k = `${this.dsPrefix}${b32key}${this.dsSuffix}`
    try {
      const value = this.protoBuf.encode(this.dsSetTransformer(data))

      await this._ps._datastore.put(new Key(k), value)
    } catch (err) {
      log.error(err)
    }
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
   * Add known data of a provided peer.
   * @param {PeerId} peerId
   * @param {Array<Data>|Data} data
   */
  add (peerId, data) {
    throw errcode(new Error('set must be implemented by the subclass'), 'ERR_NOT_IMPLEMENTED')
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

    this._ps.emit(this.eventName, {
      peerId,
      [this.eventProperty]: []
    })

    // Update Persistence datastore
    this._persistData(peerId, [])

    return true
  }

  /**
   * Set PeerId into peerStore datastructure.
   * @private
   * @param {PeerId} peerId
   */
  _setPeerId (peerId) {
    if (!this._ps.peerIds.get(peerId)) {
      this._ps.peerIds.set(peerId.toB58String(), peerId)
    }
  }
}

module.exports = Book
