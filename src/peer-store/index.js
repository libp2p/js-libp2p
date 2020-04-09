'use strict'

const errcode = require('err-code')
const debug = require('debug')
const log = debug('libp2p:peer-store')
log.error = debug('libp2p:peer-store:error')

const { EventEmitter } = require('events')

const PeerId = require('peer-id')
const PeerInfo = require('peer-info')

const AddressBook = require('./address-book')
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
   * PeerInfo object
   * @typedef {Object} peerInfo
   * @property {Array<multiaddrInfo>} multiaddrsInfos peer's information of the multiaddrs.
   * @property {Array<string>} protocols peer's supported protocols.
   */

  constructor () {
    super()

    /**
     * AddressBook containing a map of peerIdStr to multiaddrsInfo
     */
    this.addressBook = new AddressBook(this)

    /**
     * ProtoBook containing a map of peerIdStr to supported protocols.
     */
    this.protoBook = new ProtoBook(this)
  }

  // TODO: Temporary adapter for modules using PeerStore
  // This should be removed under a breaking change
  /**
   * Stores the peerInfo of a new peer on each book.
   * @param {PeerInfo} peerInfo
   * @param {object} [options]
   * @param {boolean} [options.replace = true]
   * @return {PeerInfo}
   */
  put (peerInfo, options) {
    const multiaddrs = peerInfo.multiaddrs.toArray()
    const protocols = Array.from(peerInfo.protocols || new Set())

    this.addressBook.set(peerInfo.id, multiaddrs, options)
    this.protoBook.set(peerInfo.id, protocols, options)

    const peer = this.find(peerInfo.id)
    const pInfo = new PeerInfo(peerInfo.id)

    if (!peer) {
      return pInfo
    }

    peer.protocols.forEach((p) => pInfo.protocols.add(p))
    peer.multiaddrInfos.forEach((mi) => pInfo.multiaddrs.add(mi.multiaddr))

    return pInfo
  }

  // TODO: Temporary adapter for modules using PeerStore
  // This should be removed under a breaking change
  /**
   * Get the info of the given id.
   * @param {peerId} peerId
   * @returns {PeerInfo}
   */
  get (peerId) {
    const peer = this.find(peerId)

    const pInfo = new PeerInfo(peerId)
    peer.protocols.forEach((p) => pInfo.protocols.add(p))
    peer.multiaddrInfos.forEach((mi) => pInfo.multiaddrs.add(mi.multiaddr))

    return pInfo
  }

  // TODO: Temporary adapter for modules using PeerStore
  // This should be removed under a breaking change
  /**
   * Has the info to the given id.
   * @param {PeerId} peerId
   * @returns {boolean}
   */
  has (peerId) {
    return Boolean(this.find(peerId))
  }

  // TODO: Temporary adapter for modules using PeerStore
  // This should be removed under a breaking change
  /**
   * Removes the peer provided.
   * @param {PeerId} peerId
   * @returns {boolean} true if found and removed
   */
  remove (peerId) {
    return this.delete(peerId)
  }

  // TODO: Temporary adapter for modules using PeerStore
  // This should be removed under a breaking change
  /**
   * Completely replaces the existing peers metadata with the given `peerInfo`
   * @param {PeerInfo} peerInfo
   * @returns {void}
   */
  replace (peerInfo) {
    this.put(peerInfo)
  }

  // TODO: Temporary adapter for modules using PeerStore
  // This should be removed under a breaking change
  /**
   * Returns the known multiaddrs for a given `PeerInfo`. All returned multiaddrs
   * will include the encapsulated `PeerId` of the peer.
   * @param {PeerInfo} peerInfo
   * @returns {Array<Multiaddr>}
   */
  multiaddrsForPeer (peerInfo) {
    return this.addressBook.getMultiaddrsForPeer(peerInfo.id)
  }

  /**
   * Get all the stored information of every peer.
   * @returns {Map<string, peerInfo>}
   */
  get peers () {
    const peerInfos = new Map()

    // AddressBook
    for (const [idStr, multiaddrInfos] of this.addressBook.data.entries()) {
      // TODO: Remove peerInfo and its usage on peer-info deprecate
      const peerInfo = new PeerInfo(PeerId.createFromCID(idStr))

      multiaddrInfos.forEach((mi) => peerInfo.multiaddrs.add((mi.multiaddr)))

      const protocols = this.protoBook.data.get(idStr) || []
      protocols.forEach((p) => peerInfo.protocols.add(p))

      peerInfos.set(idStr, peerInfo)
      // TODO
      // peerInfos.set(idStr, {
      //   id: PeerId.createFromCID(idStr),
      //   multiaddrInfos,
      //   protocols: this.protoBook.data.get(idStr) || []
      // })
    }

    // ProtoBook
    for (const [idStr, protocols] of this.protoBook.data.entries()) {
      // TODO: Remove peerInfo and its usage on peer-info deprecate
      const peerInfo = peerInfos.get(idStr)

      if (!peerInfo) {
        const peerInfo = new PeerInfo(PeerId.createFromCID(idStr))

        protocols.forEach((p) => peerInfo.protocols.add(p))
        peerInfos.set(idStr, peerInfo)
        // peerInfos.set(idStr, {
        //   id: PeerId.createFromCID(idStr),
        //   multiaddrInfos: [],
        //   protocols: protocols
        // })
      }
    }

    return peerInfos
  }

  /**
   * Delete the information of the given peer in every book.
   * @param {PeerId} peerId
   * @returns {boolean} true if found and removed
   */
  delete (peerId) {
    const addressesDeleted = this.addressBook.delete(peerId)
    const protocolsDeleted = this.protoBook.delete(peerId)
    return addressesDeleted || protocolsDeleted
  }

  /**
   * Find the stored information of a given peer.
   * @param {PeerId} peerId
   * @returns {peerInfo}
   */
  find (peerId) {
    if (!PeerId.isPeerId(peerId)) {
      throw errcode(new Error('peerId must be an instance of peer-id'), ERR_INVALID_PARAMETERS)
    }

    const multiaddrInfos = this.addressBook.get(peerId)
    const protocols = this.protoBook.get(peerId)

    if (!multiaddrInfos && !protocols) {
      return undefined
    }

    return {
      multiaddrInfos: multiaddrInfos || [],
      protocols: protocols || []
    }
  }
}

module.exports = PeerStore
