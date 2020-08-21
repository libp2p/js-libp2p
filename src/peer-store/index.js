'use strict'

const errcode = require('err-code')
const debug = require('debug')
const log = debug('libp2p:peer-store')
log.error = debug('libp2p:peer-store:error')

const { EventEmitter } = require('events')
const PeerId = require('peer-id')

const AddressBook = require('./address-book')
const KeyBook = require('./key-book')
const MetadataBook = require('./metadata-book')
const ProtoBook = require('./proto-book')

const {
  ERR_INVALID_PARAMETERS
} = require('../errors')

/**
 * Responsible for managing known peers, as well as their addresses, protocols and metadata.
 * @fires PeerStore#peer Emitted when a new peer is added.
 * @fires PeerStore#change:protocols Emitted when a known peer supports a different set of protocols.
 * @fires PeerStore#change:multiaddrs Emitted when a known peer has a different set of multiaddrs.
 * @fires PeerStore#change:pubkey Emitted emitted when a peer's public key is known.
 * @fires PeerStore#change:metadata Emitted when the known metadata of a peer change.
 */
class PeerStore extends EventEmitter {
  /**
   * Peer object
   * @typedef {Object} Peer
   * @property {PeerId} id peer's peer-id instance.
   * @property {Array<Address>} addresses peer's addresses containing its multiaddrs and metadata.
   * @property {Array<string>} protocols peer's supported protocols.
   * @property {Map<string, Buffer>} metadata peer's metadata map.
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
     * MetadataBook containing a map of peerIdStr to their metadata Map.
     */
    this.metadataBook = new MetadataBook(this)

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
    const storedPeers = new Set([
      ...this.addressBook.data.keys(),
      ...this.keyBook.data.keys(),
      ...this.protoBook.data.keys(),
      ...this.metadataBook.data.keys()
    ])

    const peersData = new Map()
    storedPeers.forEach((idStr) => {
      peersData.set(idStr, this.get(PeerId.createFromCID(idStr)))
    })

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
    const metadataDeleted = this.metadataBook.delete(peerId)

    return addressesDeleted || keyDeleted || protocolsDeleted || metadataDeleted
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
    const metadata = this.metadataBook.get(peerId)
    const protocols = this.protoBook.get(peerId)

    if (!id && !addresses && !metadata && !protocols) {
      return undefined
    }

    return {
      id: id || peerId,
      addresses: addresses || [],
      protocols: protocols || [],
      metadata: metadata
    }
  }
}

module.exports = PeerStore
