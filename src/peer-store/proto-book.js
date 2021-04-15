'use strict'

const debug = require('debug')
const log = Object.assign(debug('libp2p:peer-store:proto-book'), {
  error: debug('libp2p:peer-store:proto-book:err')
})
const errcode = require('err-code')
const PeerId = require('peer-id')

const Book = require('./book')

const {
  codes: { ERR_INVALID_PARAMETERS }
} = require('../errors')

/**
 * @typedef {import('./')} PeerStore
 */

/**
 * @extends {Book}
 *
 * @fires ProtoBook#change:protocols
 */
class ProtoBook extends Book {
  /**
   * The ProtoBook is responsible for keeping the known supported
   * protocols of a peer.
   *
   * @class
   * @param {PeerStore} peerStore
   */
  constructor (peerStore) {
    /**
     * PeerStore Event emitter, used by the ProtoBook to emit:
     * "change:protocols" - emitted when the known protocols of a peer change.
     */
    super({
      peerStore,
      eventName: 'change:protocols',
      eventProperty: 'protocols',
      eventTransformer: (data) => Array.from(data)
    })

    /**
     * Map known peers to their known protocols.
     *
     * @type {Map<string, Set<string>>}
     */
    this.data = new Map()
  }

  /**
   * Set known protocols of a provided peer.
   * If the peer was not known before, it will be added.
   *
   * @override
   * @param {PeerId} peerId
   * @param {string[]} protocols
   * @returns {ProtoBook}
   */
  set (peerId, protocols) {
    if (!PeerId.isPeerId(peerId)) {
      log.error('peerId must be an instance of peer-id to store data')
      throw errcode(new Error('peerId must be an instance of peer-id'), ERR_INVALID_PARAMETERS)
    }

    if (!protocols) {
      log.error('protocols must be provided to store data')
      throw errcode(new Error('protocols must be provided'), ERR_INVALID_PARAMETERS)
    }

    const id = peerId.toB58String()
    const recSet = this.data.get(id)
    const newSet = new Set(protocols)

    /**
     * @param {Set<string>} a
     * @param {Set<string>} b
     */
    const isSetEqual = (a, b) => a.size === b.size && [...a].every(value => b.has(value))

    // Already knows the peer and the recorded protocols are the same?
    // If yes, no changes needed!
    if (recSet && isSetEqual(recSet, newSet)) {
      log(`the protocols provided to store are equal to the already stored for ${id}`)
      return this
    }

    this._setData(peerId, newSet)
    log(`stored provided protocols for ${id}`)

    return this
  }

  /**
   * Adds known protocols of a provided peer.
   * If the peer was not known before, it will be added.
   *
   * @param {PeerId} peerId
   * @param {string[]} protocols
   * @returns {ProtoBook}
   */
  add (peerId, protocols) {
    if (!PeerId.isPeerId(peerId)) {
      log.error('peerId must be an instance of peer-id to store data')
      throw errcode(new Error('peerId must be an instance of peer-id'), ERR_INVALID_PARAMETERS)
    }

    if (!protocols) {
      log.error('protocols must be provided to store data')
      throw errcode(new Error('protocols must be provided'), ERR_INVALID_PARAMETERS)
    }

    const id = peerId.toB58String()
    const recSet = this.data.get(id) || new Set()
    const newSet = new Set([...recSet, ...protocols]) // Set Union

    // Any new protocol added?
    if (recSet.size === newSet.size) {
      log(`the protocols provided to store are already stored for ${id}`)
      return this
    }

    this._setData(peerId, newSet)
    log(`added provided protocols for ${id}`)

    return this
  }

  /**
   * Removes known protocols of a provided peer.
   * If the protocols did not exist before, nothing will be done.
   *
   * @param {PeerId} peerId
   * @param {string[]} protocols
   * @returns {ProtoBook}
   */
  remove (peerId, protocols) {
    if (!PeerId.isPeerId(peerId)) {
      log.error('peerId must be an instance of peer-id to store data')
      throw errcode(new Error('peerId must be an instance of peer-id'), ERR_INVALID_PARAMETERS)
    }

    if (!protocols) {
      log.error('protocols must be provided to store data')
      throw errcode(new Error('protocols must be provided'), ERR_INVALID_PARAMETERS)
    }

    const id = peerId.toB58String()
    const recSet = this.data.get(id)

    if (recSet) {
      const newSet = new Set([
        ...recSet
      ].filter((p) => !protocols.includes(p)))

      // Any protocol removed?
      if (recSet.size === newSet.size) {
        return this
      }

      this._setData(peerId, newSet)
      log(`removed provided protocols for ${id}`)
    }

    return this
  }
}

module.exports = ProtoBook
