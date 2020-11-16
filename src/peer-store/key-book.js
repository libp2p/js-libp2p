'use strict'

const errcode = require('err-code')
const debug = require('debug')
const log = debug('libp2p:peer-store:key-book')
log.error = debug('libp2p:peer-store:key-book:error')

const PeerId = require('peer-id')

const Book = require('./book')

const {
  codes: { ERR_INVALID_PARAMETERS }
} = require('../errors')

/**
 * @extends {Book}
 */
class KeyBook extends Book {
  /**
   * The KeyBook is responsible for keeping the known public keys of a peer.
   *
   * @class
   * @param {PeerStore} peerStore
   */
  constructor (peerStore) {
    super({
      peerStore,
      eventName: 'change:pubkey',
      eventProperty: 'pubkey',
      eventTransformer: (data) => data.pubKey
    })

    /**
     * Map known peers to their known Public Key.
     *
     * @type {Map<string, PeerId>}
     */
    this.data = new Map()
  }

  /**
   * Set the Peer public key.
   *
   * @override
   * @param {PeerId} peerId
   * @param {RsaPublicKey|Ed25519PublicKey|Secp256k1PublicKey} publicKey
   * @returns {KeyBook}
   */
  set (peerId, publicKey) {
    if (!PeerId.isPeerId(peerId)) {
      log.error('peerId must be an instance of peer-id to store data')
      throw errcode(new Error('peerId must be an instance of peer-id'), ERR_INVALID_PARAMETERS)
    }

    const id = peerId.toB58String()
    const recPeerId = this.data.get(id)

    // If no record available, and this is valid
    if (!recPeerId && publicKey) {
      // This might be unecessary, but we want to store the PeerId
      // to avoid an async operation when reconstructing the PeerId
      peerId.pubKey = publicKey

      this._setData(peerId, peerId)
      log(`stored provided public key for ${id}`)
    }

    return this
  }

  /**
   * Get Public key of the given PeerId, if stored.
   *
   * @override
   * @param {PeerId} peerId
   * @returns {RsaPublicKey|Ed25519PublicKey|Secp256k1PublicKey}
   */
  get (peerId) {
    if (!PeerId.isPeerId(peerId)) {
      throw errcode(new Error('peerId must be an instance of peer-id'), ERR_INVALID_PARAMETERS)
    }

    const rec = this.data.get(peerId.toB58String())

    return rec ? rec.pubKey : undefined
  }
}

module.exports = KeyBook
