'use strict'

const debug = require('debug')
const errcode = require('err-code')
const { codes } = require('../errors')

/**
 * @typedef {import('./types').PeerStore} PeerStore
 * @typedef {import('./types').ProtoBook} ProtoBook
 * @typedef {import('peer-id')} PeerId
 */

const log = Object.assign(debug('libp2p:peer-store:proto-book'), {
  error: debug('libp2p:peer-store:proto-book:err')
})

const EVENT_NAME = 'change:protocols'

/**
 * @param {Set<string>} a
 * @param {Set<string>} b
 */
function isSetEqual (a, b) {
  return a.size === b.size && [...a].every(value => b.has(value))
}

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
    } finally {
      log('get release read lock')
      release()
    }
  }

  /**
   * @param {PeerId} peerId
   * @param {string[]} protocols
   */
  async set (peerId, protocols) {
    log('set await write lock')
    const release = await this._store.lock.writeLock()
    log('set got write lock')

    try {
      if (!protocols) {
        log.error('protocols must be provided to store data')
        throw errcode(new Error('protocols must be provided'), codes.ERR_INVALID_PARAMETERS)
      }

      const peer = await this._store.load(peerId)

      if (isSetEqual(new Set(peer.protocols), new Set(protocols))) {
        log(`the protocols provided to set are equal to those already stored for ${peerId.toB58String()}`)
        return
      }

      await this._store.merge(peerId, {
        protocols
      })

      log(`stored provided protocols for ${peerId.toB58String()}`)
    } finally {
      log('set release write lock')
      release()
    }

    this._emit(EVENT_NAME, { peerId, protocols })
  }

  /**
   * @param {PeerId} peerId
   * @param {string[]} protocols
   */
  async add (peerId, protocols) {
    log('add await write lock')
    const release = await this._store.lock.writeLock()
    log('add got write lock')

    try {
      if (!protocols) {
        log.error('protocols must be provided to store data')
        throw errcode(new Error('protocols must be provided'), codes.ERR_INVALID_PARAMETERS)
      }

      const peer = await this._store.load(peerId)
      const existingProtocols = new Set(peer.protocols)
      const allProtocols = new Set([...existingProtocols, ...protocols])

      if (isSetEqual(new Set(allProtocols), existingProtocols)) {
        log(`the protocols provided to add are equal to those already stored for ${peerId.toB58String()}`)
        return
      }

      protocols = Array.from(allProtocols)

      await this._store.merge(peerId, {
        protocols
      })

      log(`added provided protocols for ${peerId.toB58String()}`)
    } finally {
      log('add release write lock')
      release()
    }

    this._emit(EVENT_NAME, { peerId, protocols })
  }

  /**
   * @param {PeerId} peerId
   * @param {string[]} protocols
   */
  async remove (peerId, protocols) {
    log('remove await write lock')
    const release = await this._store.lock.writeLock()
    log('remove got write lock')

    try {
      if (!Array.isArray(protocols)) {
        log.error('protocols must be provided to store data')
        throw errcode(new Error('protocols must be provided'), codes.ERR_INVALID_PARAMETERS)
      }

      if (!(await this._store.has(peerId))) {
        return
      }

      const peer = await this._store.load(peerId)
      const finalProtocols = new Set(peer.protocols)

      for (const protocol of protocols) {
        finalProtocols.delete(protocol)
      }

      if (isSetEqual(new Set(peer.protocols), new Set(finalProtocols))) {
        log(`the protocols after removing are equal to those already stored for ${peerId.toB58String()}`)
        return
      }

      protocols = Array.from(finalProtocols)

      await this._store.merge(peerId, {
        protocols
      })
    } finally {
      log('remove release write lock')
      release()
    }

    this._emit(EVENT_NAME, { peerId, protocols })
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

      if (has) {
        await this._store.merge(peerId, {
          protocols: []
        })
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
