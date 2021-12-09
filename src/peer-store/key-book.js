'use strict'

const debug = require('debug')
const errcode = require('err-code')
const { codes } = require('../errors')
const PeerId = require('peer-id')
const { equals: uint8arrayEquals } = require('uint8arrays/equals')

/**
 * @typedef {import('./types').PeerStore} PeerStore
 * @typedef {import('./types').KeyBook} KeyBook
 * @typedef {import('libp2p-interfaces/src/keys/types').PublicKey} PublicKey
 */

const log = Object.assign(debug('libp2p:peer-store:key-book'), {
  error: debug('libp2p:peer-store:key-book:err')
})

const EVENT_NAME = 'change:pubkey'

/**
 * @implements {KeyBook}
 */
class PeerStoreKeyBook {
  /**
   * The KeyBook is responsible for keeping the known public keys of a peer.
   *
   * @param {PeerStore["emit"]} emit
   * @param {import('./types').Store} store
   */
  constructor (emit, store) {
    this._emit = emit
    this._store = store
  }

  /**
   * Set the Peer public key
   *
   * @param {PeerId} peerId
   * @param {PublicKey} publicKey
   */
  async set (peerId, publicKey) {
    log('set await write lock')
    const release = await this._store.lock.writeLock()
    log('set got write lock')

    let updatedKey

    try {
      if (!publicKey) {
        log.error('publicKey must be an instance of PublicKey to store data')
        throw errcode(new Error('publicKey must be an instance of PublicKey'), codes.ERR_INVALID_PARAMETERS)
      }

      if (peerId.pubKey && !uint8arrayEquals(peerId.pubKey.bytes, publicKey.bytes)) {
        log.error('publicKey bytes do not match peer id publicKey bytes')
        throw errcode(new Error('publicKey bytes do not match peer id publicKey bytes'), codes.ERR_INVALID_PARAMETERS)
      }

      const peer = await this._store.load(peerId)

      if (!peer.pubKey || !uint8arrayEquals(peer.pubKey.bytes, publicKey.bytes)) {
        await this._store.merge(peerId, {
          pubKey: publicKey
        })

        updatedKey = true

        log(`stored provided public key for ${peerId.toB58String()}`)
      }

    } finally {
      log('set release write lock')
      release()
    }

    if (updatedKey) {
      this._emit(EVENT_NAME, { peerId, pubKey: publicKey })
    }
  }

  /**
   * Get Public key of the given PeerId, if stored
   *
   * @param {PeerId} peerId
   */
  async get (peerId) {
    log('get await write lock')
    const release = await this._store.lock.readLock()
    log('get got write lock')

    try {
      if (!PeerId.isPeerId(peerId)) {
        log.error('peerId must be an instance of peer-id to store data')
        throw errcode(new Error('peerId must be an instance of peer-id'), codes.ERR_INVALID_PARAMETERS)
      }

      const peer = await this._store.load(peerId)

      return peer.pubKey
    } finally {
      log('get release write lock')
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

    let has

    try {
      has = await this._store.has(peerId)

      if (has) {
        const peer = await this._store.load(peerId)
        has = Boolean(peer.pubKey)

        if (has) {
          await this._store.merge(peerId, {
            pubKey: undefined
          })
        }
      }
    } finally {
      log('delete release write lock')
      release()
    }

    if (has) {
      this._emit(EVENT_NAME, { peerId, pubKey: undefined })
    }
  }
}

module.exports = PeerStoreKeyBook
