'use strict'

const debug = require('debug')
const errcode = require('err-code')
const { codes } = require('../errors')
const PeerId = require('peer-id')
const { equals: uint8ArrayEquals } = require('uint8arrays/equals')

const log = Object.assign(debug('libp2p:peer-store:metadata-book'), {
  error: debug('libp2p:peer-store:metadata-book:err')
})

/**
 * @typedef {import('./types').PeerStore} PeerStore
 * @typedef {import('./types').MetadataBook} MetadataBook
 */

const EVENT_NAME = 'change:metadata'

/**
 * @implements {MetadataBook}
 */
class PeerStoreMetadataBook {
  /**
   * The MetadataBook is responsible for keeping the known supported
   * protocols of a peer
   *
   * @param {PeerStore["emit"]} emit
   * @param {import('./types').Store} store
   */
  constructor (emit, store) {
    this._emit = emit
    this._store = store
  }

  /**
   * Get the known data of a provided peer
   *
   * @param {PeerId} peerId
   */
  async get (peerId) {
    log('get await read lock')
    const release = await this._store.lock.readLock()
    log('get got read lock')

    try {
      const peer = await this._store.load(peerId)

      return peer.metadata
    } finally {
      log('get release read lock')
      release()
    }
  }

  /**
   * Get specific metadata value, if it exists
   *
   * @param {PeerId} peerId
   * @param {string} key
   */
  async getValue (peerId, key) {
    log('getValue await read lock')
    const release = await this._store.lock.readLock()
    log('getValue got read lock')

    try {
      const peer = await this._store.load(peerId)

      return peer.metadata.get(key)
    } finally {
      log('getValue release write lock')
      release()
    }
  }

  /**
   * @param {PeerId} peerId
   * @param {Map<string, Uint8Array>} metadata
   */
  async set (peerId, metadata) {
    log('set await write lock')
    const release = await this._store.lock.writeLock()
    log('set got write lock')

    try {
      if (!metadata || !(metadata instanceof Map)) {
        log.error('valid metadata must be provided to store data')
        throw errcode(new Error('valid metadata must be provided'), codes.ERR_INVALID_PARAMETERS)
      }

      await this._store.merge(peerId, {
        metadata
      })

      this._emit(EVENT_NAME, { peerId, metadata })
    } finally {
      log('set release write lock')
      release()
    }
  }

  /**
   * Set metadata key and value of a provided peer
   *
   * @param {PeerId} peerId
   * @param {string} key - metadata key
   * @param {Uint8Array} value - metadata value
   */
  async setValue (peerId, key, value) {
    log('setValue await write lock')
    const release = await this._store.lock.writeLock()
    log('setValue got write lock')

    try {
      if (!PeerId.isPeerId(peerId)) {
        log.error('peerId must be an instance of peer-id to store data')
        throw errcode(new Error('peerId must be an instance of peer-id'), codes.ERR_INVALID_PARAMETERS)
      }

      if (typeof key !== 'string' || !(value instanceof Uint8Array)) {
        log.error('valid key and value must be provided to store data')
        throw errcode(new Error('valid key and value must be provided'), codes.ERR_INVALID_PARAMETERS)
      }

      const peer = await this._store.load(peerId)
      const existingValue = peer.metadata.get(key)

      if (existingValue && uint8ArrayEquals(existingValue, value)) {
        return
      }

      peer.metadata.set(key, value)

      await this._store.merge(peerId, {
        metadata: peer.metadata
      })

      this._emit(EVENT_NAME, { peerId, metadata: peer.metadata })
    } finally {
      log('setValue release write lock')
      release()
    }
  }

  /**
   * @param {PeerId} peerId
   */
  async delete (peerId) {
    log('delete await write lock')
    const release = await this._store.lock.writeLock()
    log('delete got write lock')

    let metadata

    try {
      if (await this._store.has(peerId)) {
        metadata = new Map()

        await this._store.merge(peerId, {
          metadata
        })
      }
    } finally {
      log('delete release write lock')
      release()
    }

    if (metadata) {
      this._emit(EVENT_NAME, { peerId, metadata: metadata })
    }
  }

  /**
   * @param {PeerId} peerId
   * @param {string} key
   */
  async deleteValue (peerId, key) {
    log('deleteValue await write lock')
    const release = await this._store.lock.writeLock()
    log('deleteValue got write lock')

    let metadata

    try {
      if (await this._store.has(peerId)) {
        const peer = await this._store.load(peerId)
        peer.metadata.delete(key)
        metadata = peer.metadata

        await this._store.merge(peerId, {
          metadata
        })
      }
    } finally {
      log('deleteValue release write lock')
      release()
    }

    if (metadata) {
      this._emit(EVENT_NAME, { peerId, metadata })
    }
  }
}

module.exports = PeerStoreMetadataBook
