'use strict'

const errcode = require('err-code')
const debug = require('debug')
const log = debug('libp2p:peer-store')
log.error = debug('libp2p:peer-store:error')

const { EventEmitter } = require('events')
const PeerId = require('peer-id')

const AddressBook = require('./address-book')
const KeyBook = require('./key-book')
const ProtoBook = require('./proto-book')

const {
  ERR_INVALID_PARAMETERS
} = require('../errors')

/**
 * Responsible for managing known peers, as well as their addresses, protocols and metadata.
 * @fires PeerStore#peer Emitted when a new peer is added.
 * @fires PeerStore#change:protocols Emitted when a known peer supports a different set of protocols.
 * @fires PeerStore#change:multiaddrs Emitted when a known peer has a different set of multiaddrs.
 */
class PeerStore extends EventEmitter {
  /**
   * Peer object
   * @typedef {Object} Peer
   * @property {PeerId} id peer's peer-id instance.
   * @property {Array<Address>} addresses peer's addresses containing its multiaddrs and metadata.
   * @property {Array<string>} protocols peer's supported protocols.
   */

  /**
   * @constructor
   */
  constructor () {
    super()

    /**
     * AddressBook containing a map of peerIdStr to Address.
     */
    this.addressBook = new AddressBook(this)

    /**
     * KeyBook containing a map of peerIdStr to their PeerId with public keys.
     */
    this.keyBook = new KeyBook(this)

    /**
     * ProtoBook containing a map of peerIdStr to supported protocols.
     */
    this.protoBook = new ProtoBook(this)
  }

  /**
   * Start the PeerStore.
   */
  start () {}

  /**
   * Stop the PeerStore.
   */
  stop () {}

  /**
   * Get all the stored information of every peer.
   * @returns {Map<string, Peer>}
   */
  get peers () {
    const peersData = new Map()

    // AddressBook
    for (const [idStr, addresses] of this.addressBook.data.entries()) {
      const id = this.keyBook.data.get(idStr) || PeerId.createFromCID(idStr)
      peersData.set(idStr, {
        id,
        addresses,
        protocols: this.protoBook.get(id) || []
      })
    }

    // ProtoBook
    for (const [idStr, protocols] of this.protoBook.data.entries()) {
      const pData = peersData.get(idStr)
      const id = this.keyBook.data.get(idStr) || PeerId.createFromCID(idStr)

      if (!pData) {
        peersData.set(idStr, {
          id,
          addresses: [],
          protocols: Array.from(protocols)
        })
      }
    }

    return peersData
  }

  /**
   * Delete the information of the given peer in every book.
   * @param {PeerId} peerId
   * @returns {boolean} true if found and removed
   */
  delete (peerId) {
    const addressesDeleted = this.addressBook.delete(peerId)
    const keyDeleted = this.keyBook.delete(peerId)
    const protocolsDeleted = this.protoBook.delete(peerId)

    return addressesDeleted || keyDeleted || protocolsDeleted
  }

  /**
   * Get the stored information of a given peer.
   * @param {PeerId} peerId
   * @returns {Peer}
   */
  get (peerId) {
    if (!PeerId.isPeerId(peerId)) {
      throw errcode(new Error('peerId must be an instance of peer-id'), ERR_INVALID_PARAMETERS)
    }

    const id = this.keyBook.data.get(peerId.toB58String())
    const addresses = this.addressBook.get(peerId)
    const protocols = this.protoBook.get(peerId)

    if (!addresses && !protocols) {
      return undefined
    }

    return {
      id: id || peerId,
      addresses: addresses || [],
      protocols: protocols || []
    }
  }
}

module.exports = PeerStore
