'use strict'

const errcode = require('err-code')
const PeerId = require('peer-id')
const PeerInfo = require('peer-info')

const {
  ERR_INVALID_PARAMETERS
} = require('../errors')

/**
 * The Book is the skeleton for the PeerStore books.
 */
class Book {
  constructor (eventEmitter, eventName, eventProperty) {
    this.eventEmitter = eventEmitter
    this.eventName = eventName
    this.eventProperty = eventProperty

    /**
     * Map known peers to their data.
     * @type {Map<string, Array<Data>}
     */
    this.data = new Map()
  }

  /**
   * Set known data of a provided peer.
   * @param {PeerId} peerId
   * @param {Array<Data>|Data} data
   * @param {Object} [options]
   * @param {boolean} [options.replace = true] wether data received replace stored the one or a unique union is performed.
   */
  set (peerId, data, options) {
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

    const rec = this.data.get(peerId.toString())

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

    if (!this.data.delete(peerId.toString())) {
      return false
    }

    // TODO: Remove peerInfo and its usage on peer-info deprecate
    const peerInfo = new PeerInfo(peerId)

    this.eventEmitter.emit(this.eventName, {
      peerId,
      peerInfo,
      [this.eventProperty]: []
    })

    return true
  }
}

module.exports = Book
