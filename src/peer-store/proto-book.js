'use strict'

const debug = require('debug')
const errcode = require('err-code')
const { codes } = require('../errors')
const PeerId = require('peer-id')

/**
 * @typedef {import('./types').PeerStore} PeerStore
 * @typedef {import('./types').ProtoBook} ProtoBook
 */

const log = Object.assign(debug('libp2p:peer-store:proto-book'), {
  error: debug('libp2p:peer-store:proto-book:err')
})

const EVENT_NAME = 'change:protocols'

/**
 * @implements {ProtoBook}
 */
class PersistentProtoBook {
  /**
   * @param {PeerStore["emit"]} emit
   * @param {import('./types').Store} store
   */
  constructor (emit, store) {
    this._emit = emit
    this._store = store
  }

  /**
   * @param {PeerId} peerId
   */
  async get (peerId) {
    log('get wait for read lock')
    const release = await this._store.lock.readLock()
    log('get got read lock')

    try {
      const peer = await this._store.load(peerId)

      return peer.protocols
    } catch (/** @type {any} */ err) {
      if (err.code !== codes.ERR_NOT_FOUND) {
        throw err
      }
    } finally {
      log('get release read lock')
      release()
    }

    return []
  }

  /**
   * @param {PeerId} peerId
   * @param {string[]} protocols
   */
  async set (peerId, protocols) {
    if (!PeerId.isPeerId(peerId)) {
      log.error('peerId must be an instance of peer-id to store data')
      throw errcode(new Error('peerId must be an instance of peer-id'), codes.ERR_INVALID_PARAMETERS)
    }

    if (!Array.isArray(protocols)) {
      log.error('protocols must be provided to store data')
      throw errcode(new Error('protocols must be provided'), codes.ERR_INVALID_PARAMETERS)
    }

    log('set await write lock')
    const release = await this._store.lock.writeLock()
    log('set got write lock')

    let updatedPeer

    try {
      try {
        const peer = await this._store.load(peerId)

        if (new Set([
          ...protocols
        ]).size === peer.protocols.length) {
          return
        }
      } catch (/** @type {any} */ err) {
        if (err.code !== codes.ERR_NOT_FOUND) {
          throw err
        }
      }

      updatedPeer = await this._store.patchOrCreate(peerId, {
        protocols
      })

      log(`stored provided protocols for ${peerId.toB58String()}`)
    } finally {
      log('set release write lock')
      release()
    }

    this._emit(EVENT_NAME, { peerId, protocols: updatedPeer.protocols })
  }

  /**
   * @param {PeerId} peerId
   * @param {string[]} protocols
   */
  async add (peerId, protocols) {
    if (!PeerId.isPeerId(peerId)) {
      log.error('peerId must be an instance of peer-id to store data')
      throw errcode(new Error('peerId must be an instance of peer-id'), codes.ERR_INVALID_PARAMETERS)
    }

    if (!Array.isArray(protocols)) {
      log.error('protocols must be provided to store data')
      throw errcode(new Error('protocols must be provided'), codes.ERR_INVALID_PARAMETERS)
    }

    log('add await write lock')
    const release = await this._store.lock.writeLock()
    log('add got write lock')

    let updatedPeer

    try {
      try {
        const peer = await this._store.load(peerId)

        if (new Set([
          ...peer.protocols,
          ...protocols
        ]).size === peer.protocols.length) {
          return
        }
      } catch (/** @type {any} */ err) {
        if (err.code !== codes.ERR_NOT_FOUND) {
          throw err
        }
      }

      updatedPeer = await this._store.mergeOrCreate(peerId, {
        protocols
      })

      log(`added provided protocols for ${peerId.toB58String()}`)
    } finally {
      log('add release write lock')
      release()
    }

    this._emit(EVENT_NAME, { peerId, protocols: updatedPeer.protocols })
  }

  /**
   * @param {PeerId} peerId
   * @param {string[]} protocols
   */
  async remove (peerId, protocols) {
    if (!PeerId.isPeerId(peerId)) {
      log.error('peerId must be an instance of peer-id to store data')
      throw errcode(new Error('peerId must be an instance of peer-id'), codes.ERR_INVALID_PARAMETERS)
    }

    if (!Array.isArray(protocols)) {
      log.error('protocols must be provided to store data')
      throw errcode(new Error('protocols must be provided'), codes.ERR_INVALID_PARAMETERS)
    }

    log('remove await write lock')
    const release = await this._store.lock.writeLock()
    log('remove got write lock')

    let updatedPeer

    try {
      try {
        const peer = await this._store.load(peerId)
        const protocolSet = new Set(peer.protocols)

        for (const protocol of protocols) {
          protocolSet.delete(protocol)
        }

        if (peer.protocols.length === protocolSet.size) {
          return
        }

        protocols = Array.from(protocolSet)
      } catch (/** @type {any} */ err) {
        if (err.code !== codes.ERR_NOT_FOUND) {
          throw err
        }
      }

      updatedPeer = await this._store.patchOrCreate(peerId, {
        protocols
      })
    } finally {
      log('remove release write lock')
      release()
    }

    this._emit(EVENT_NAME, { peerId, protocols: updatedPeer.protocols })
  }

  /**
   * @param {PeerId} peerId
   */
  async delete (peerId) {
    log('delete await write lock')
    const release = await this._store.lock.writeLock()
    log('delete got write lock')
    let has

    try {
      has = await this._store.has(peerId)

      await this._store.patchOrCreate(peerId, {
        protocols: []
      })
    } catch (/** @type {any} */ err) {
      if (err.code !== codes.ERR_NOT_FOUND) {
        throw err
      }
    } finally {
      log('delete release write lock')
      release()
    }

    if (has) {
      this._emit(EVENT_NAME, { peerId, protocols: [] })
    }
  }
}

module.exports = PersistentProtoBook
