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
   * @param {Object} [properties.event] Event properties. If not provided, no events will be emitted.
   * @param {string} [properties.event.name] Name of the event to emit by the PeerStore.
   * @param {string} [properties.event.property] Name of the property to emit by the PeerStore.
   * @param {function} [properties.events.transformer] Transformer function of the provided data for being emitted.
   * @param {Object} [properties.ds] Datastore properties. If not provided, no data will be persisted.
   * @param {String} [properties.ds.prefix] Prefix of the Datastore Key
   * @param {String} [properties.ds.suffix = ''] Suffix of the Datastore Key
   * @param {function} [properties.ds.setTransformer] Transformer function of the provided data for being persisted.
   * @param {function} [properties.ds.getTransformer] Transformer function of the persisted data to be loaded.
   */
  constructor ({
    peerStore,
    event,
    ds
  }) {
    this._ps = peerStore
    this.event = event
    this.ds = ds

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
    if (!this._ps._datastore || !this._ps._enabledPersistance || !this.ds) {
      return
    }

    const prefix = this.ds.prefix || ''
    const suffix = this.ds.suffix || ''
    const transformer = this.ds.getTransformer || passthrough

    for await (const { key, value } of this._ps._datastore.query({ prefix })) {
      try {
        // PeerId to add to the book
        const b32key = key.toString()
          .replace(prefix, '') // remove prefix from key
          .replace(suffix, '') // remove suffix from key
        const peerId = PeerId.createFromCID(b32key)
        // Data in the format to add to the book
        const data = transformer(value)
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
    if (this.event && emit) {
      const transformer = this.event.transformer || passthrough

      this._ps.emit(this.event.name, {
        peerId,
        [this.event.property]: transformer(data)
      })
    }

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
    if (!this._ps._datastore || !this._ps._enabledPersistance || !this.ds) {
      return
    }

    const prefix = this.ds.prefix || ''
    const suffix = this.ds.suffix || ''
    const transformer = this.ds.setTransformer || passthrough

    const b32key = peerId.toString()
    const k = `${prefix}${b32key}${suffix}`
    try {
      const value = transformer(data)

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

    // Emit event
    this.event && this._ps.emit(this.event.name, {
      peerId,
      [this.event.property]: []
    })

    // Update Persistence datastore
    if (this._ps._datastore && this._ps._enabledPersistance && this.ds) {
      const prefix = this.ds.prefix || ''
      const suffix = this.ds.suffix || ''
      const b32key = peerId.toString()

      const k = `${prefix}${b32key}${suffix}`
      this._ps._datastore.delete(new Key(k))
    }

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
