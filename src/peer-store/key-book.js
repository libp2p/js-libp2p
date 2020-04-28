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
 * The KeyBook is responsible for keeping the known public keys of a peer.
 */
class KeyBook extends Book {
  /**
  * @constructor
  * @param {PeerStore} peerStore
  */
  constructor (peerStore) {
    super({
      peerStore,
      eventName: 'change:pubkey', // TODO: the name is not probably the best!?
      eventProperty: 'pubkey',
      eventTransformer: (data) => data.pubKey
    })

    /**
     * Map known peers to their known Public Key.
     * @type {Map<string, PeerId>}
     */
    this.data = new Map()
  }

  /**
   * Set PeerId. If the peer was not known before, it will be added.
   * @override
   * @param {PeerId} peerId
   * @return {KeyBook}
 */
  set (peerId) {
    if (!PeerId.isPeerId(peerId)) {
      log.error('peerId must be an instance of peer-id to store data')
      throw errcode(new Error('peerId must be an instance of peer-id'), ERR_INVALID_PARAMETERS)
    }

    const id = peerId.toB58String()
    const recPeerId = this.data.get(id)

    !recPeerId && this._ps.emit('peer', peerId)
    // If no record available, or it is incomplete
    if (!recPeerId || (peerId.pubKey && !recPeerId.pubKey)) {
      this._setData(peerId, peerId, {
        emit: Boolean(peerId.pubKey) // No persistence if no public key
      })
      log(`stored provided public key for ${id}`)
    }

    return this
  }

  /**
   * Get Public key of the given PeerId, if stored.
   * @override
   * @param {PeerId} peerId
   * @return {PublicKey}
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
