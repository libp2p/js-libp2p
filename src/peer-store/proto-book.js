'use strict'

const errcode = require('err-code')
const debug = require('debug')
const log = debug('libp2p:peer-store:proto-book')
log.error = debug('libp2p:peer-store:proto-book:error')

const PeerId = require('peer-id')

const {
  ERR_INVALID_PARAMETERS
} = require('../errors')

/**
 * The ProtoBook is responsible for keeping the known suppoerted
 * protocols of a peer.
 * @fires ProtoBook#change:protocols
 */
class ProtoBook {
  /**
  * @constructor
  * @param {EventEmitter} peerStore
  */
  constructor (peerStore) {
    /**
     * PeerStore Event emitter, used by the ProtoBook to emit:
     * "change:protocols" - emitted when the known protocols of a peer change.
     */
    this._ps = peerStore

    /**
     * Map known peers to their known protocols.
     * @type {Map<string, Set<string>}
     */
    this.protoBook = new Map()
  }

  /**
   * Set known protocols of a provided peer.
   * If the peer was not known before, it will be added.
   * @param {PeerId} peerId
   * @param {Array<string>|string} protocols
   * @param {Object} [options]
   * @param {boolean} [options.replace = true] wether protocols received replace stored ones or a unique union is performed.
   * @returns {Array<string>}
   */
  set (peerId, protocols, { replace = true } = {}) {
    if (!PeerId.isPeerId(peerId)) {
      throw errcode(new Error('peerId must be an instance of peer-id'), ERR_INVALID_PARAMETERS)
    }

    if (!protocols) {
      throw errcode(new Error('protocols must be provided'), ERR_INVALID_PARAMETERS)
    }

    if (!Array.isArray(protocols)) {
      protocols = [protocols]
    }

    if (replace) {
      return this._replace(PeerId, protocols)
    }

    return this._add(PeerId, protocols)
  }

  /**
   * Replace known protocols to a provided peer.
   * If the peer is not known, it is set with the given protocols.
   * @param {PeerId} peerId
   * @param {Array<string>} protocols
   * @returns {Array<string>}
   */
  _replace (peerId, protocols) {
    const id = peerId.toString()
    const recSet = this.protoBook.get(id)
    const newSet = new Set(protocols)

    const isSetEqual = (a, b) => a.size === b.size && [...a].every(value => b.has(value))

    // Already know the peer and the recorded protocols are the same?
    // If yes, no changes needed!
    if (recSet && isSetEqual(recSet, newSet)) {
      return protocols
    }

    this.protoBook.set(id, newSet)
    this._ps.emit('change:protocols', {
      peerId,
      protocols
    })

    return protocols
  }

  /**
   * Add new known protocols to a provided peer.
   * If the peer is not known, it is set with the given protocols.
   * @param {PeerId} peerId
   * @param {Array<string>|string} protocols
   * @returns {Array<string>}
   */
  _add (peerId, protocols) {
    const id = peerId.toString()
    const recSet = this.protoBook.get(id) || new Set()
    const newSet = new Set([...recSet, ...protocols])

    // Any new protocol added?
    if (recSet.size === newSet.size) {
      return protocols
    }

    protocols = [...newSet]

    this.protoBook.set(id, newSet)
    this._ps.emit('change:protocols', {
      peerId,
      protocols
    })

    return protocols
  }

  /**
   * Get known supported protocols of a provided peer.
   * @param {PeerId} peerId
   * @returns {Array<string>}
   */
  get (peerId) {
    if (!PeerId.isPeerId(peerId)) {
      throw errcode(new Error('peerId must be an instance of peer-id'), ERR_INVALID_PARAMETERS)
    }

    const recSet = this.protoBook.get(peerId.toString())

    return recSet ? [...recSet] : undefined
  }

  /**
   * Verify if the provided peer supports the given protocols.
   * @param {PeerId} peerId
   * @param {Array<string>|string} protocols
   * @returns {boolean}
   */
  supports (peerId, protocols) {
    if (!PeerId.isPeerId(peerId)) {
      throw errcode(new Error('peerId must be an instance of peer-id'), ERR_INVALID_PARAMETERS)
    }

    if (!Array.isArray(protocols)) {
      protocols = [protocols]
    }

    const recSet = this.protoBook.get(peerId.toString())

    if (!recSet) {
      return false
    }

    return [...recSet].filter((p) => protocols.includes(p)).length === protocols.length
  }

  /**
   * Has known protocols of a provided peer.
   * @param {PeerId} peerId
   * @returns {boolean}
   */
  has (peerId) {
    if (!PeerId.isPeerId(peerId)) {
      throw errcode(new Error('peerId must be an instance of peer-id'), ERR_INVALID_PARAMETERS)
    }

    return this.protoBook.has(peerId.toString())
  }

  /**
   * Deletes the provided peer from the book.
   * If protocols are provided, just remove the provided protocols and keep the peer.
   * @param {PeerId} peerId
   * @param {Array<string>|string} [protocols]
   * @returns {boolean}
   */
  delete (peerId, protocols) {
    if (!PeerId.isPeerId(peerId)) {
      throw errcode(new Error('peerId must be an instance of peer-id'), ERR_INVALID_PARAMETERS)
    }

    if (protocols) {
      return this._remove(peerId, protocols)
    }

    if (!this.protoBook.delete(peerId.toString())) {
      return false
    }

    this._ps.emit('change:protocols', {
      peerId,
      protocols: []
    })

    return true
  }

  /**
   * Removes the given protocols from the provided peer.
   * @param {PeerId} peerId
   * @param {Array<string>|string} protocols
   * @returns {boolean}
   */
  _remove (peerId, protocols) {
    if (!Array.isArray(protocols)) {
      protocols = [protocols]
    }

    const recSet = this.protoBook.get(peerId.toString())

    if (!recSet) {
      return false
    }

    protocols.forEach((p) => recSet.delete(p))
    // TODO: should we keep it if empty?

    this._ps.emit('change:protocols', {
      peerId,
      protocols: [...recSet]
    })

    return true
  }
}

module.exports = ProtoBook
