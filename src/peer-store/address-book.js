'use strict'

const errcode = require('err-code')
const debug = require('debug')
const log = debug('libp2p:peer-store:address-book')
log.error = debug('libp2p:peer-store:address-book:error')

const multiaddr = require('multiaddr')
const PeerId = require('peer-id')
const PeerInfo = require('peer-info')

const Book = require('./book')

const {
  ERR_INVALID_PARAMETERS
} = require('../errors')

/**
 * The AddressBook is responsible for keeping the known multiaddrs
 * of a peer.
 */
class AddressBook extends Book {
  /**
   * MultiaddrInfo object
   * @typedef {Object} MultiaddrInfo
   * @property {Multiaddr} multiaddr peer multiaddr.
   */

  /**
  * @constructor
  * @param {PeerStore} peerStore
  */
  constructor (peerStore) {
    /**
     * PeerStore Event emitter, used by the AddressBook to emit:
     * "peer" - emitted when a peer is discovered by the node.
     * "change:multiaddrs" - emitted when the known multiaddrs of a peer change.
     */
    super(peerStore, 'change:multiaddrs', 'multiaddrs')

    /**
     * Map known peers to their known multiaddrs.
     * @type {Map<string, Array<MultiaddrInfo>>}
     */
    this.data = new Map()
  }

  /**
   * Set known addresses of a provided peer.
   * @override
   * @param {PeerId} peerId
   * @param {Array<Multiaddr>} addresses
   * @returns {AddressBook}
   */
  set (peerId, addresses) {
    if (!PeerId.isPeerId(peerId)) {
      log.error('peerId must be an instance of peer-id to store data')
      throw errcode(new Error('peerId must be an instance of peer-id'), ERR_INVALID_PARAMETERS)
    }

    const multiaddrInfos = this._toMultiaddrInfos(addresses)
    const id = peerId.toB58String()
    const rec = this.data.get(id)

    // Not replace multiaddrs
    if (!multiaddrInfos.length) {
      return this
    }

    // Already knows the peer
    if (rec && rec.length === multiaddrInfos.length) {
      const intersection = rec.filter((mi) => multiaddrInfos.some((newMi) => mi.multiaddr.equals(newMi.multiaddr)))

      // Are new addresses equal to the old ones?
      // If yes, no changes needed!
      if (intersection.length === rec.length) {
        log(`the addresses provided to store are equal to the already stored for ${id}`)
        return this
      }
    }

    this.data.set(id, multiaddrInfos)
    this._setPeerId(peerId)
    log(`stored provided multiaddrs for ${id}`)

    // TODO: Remove peerInfo and its usage on peer-info deprecate
    const peerInfo = new PeerInfo(peerId)
    multiaddrInfos.forEach((mi) => peerInfo.multiaddrs.add(mi.multiaddr))

    // Notify the existance of a new peer
    if (!rec) {
      // this._ps.emit('peer', peerId)
      this._ps.emit('peer', peerInfo)
    }

    this._ps.emit('change:multiaddrs', {
      peerId,
      peerInfo,
      multiaddrs: multiaddrInfos.map((mi) => mi.multiaddr)
    })

    return this
  }

  /**
   * Add known addresses of a provided peer.
   * If the peer is not known, it is set with the given addresses.
   * @override
   * @param {PeerId} peerId
   * @param {Array<Multiaddr>} addresses
   * @returns {AddressBook}
   */
  add (peerId, addresses) {
    if (!PeerId.isPeerId(peerId)) {
      log.error('peerId must be an instance of peer-id to store data')
      throw errcode(new Error('peerId must be an instance of peer-id'), ERR_INVALID_PARAMETERS)
    }

    const multiaddrInfos = this._toMultiaddrInfos(addresses)
    const id = peerId.toB58String()
    const rec = this.data.get(id)

    // Add recorded uniquely to the new array (Union)
    rec && rec.forEach((mi) => {
      if (!multiaddrInfos.find(r => r.multiaddr.equals(mi.multiaddr))) {
        multiaddrInfos.push(mi)
      }
    })

    // If the recorded length is equal to the new after the unique union
    // The content is the same, no need to update.
    if (rec && rec.length === multiaddrInfos.length) {
      log(`the addresses provided to store are already stored for ${id}`)
      return this
    }

    this._setPeerId(peerId)
    this.data.set(id, multiaddrInfos)

    log(`added provided multiaddrs for ${id}`)

    // TODO: Remove peerInfo and its usage on peer-info deprecate
    const peerInfo = new PeerInfo(peerId)
    multiaddrInfos.forEach((mi) => peerInfo.multiaddrs.add(mi.multiaddr))

    this._ps.emit('change:multiaddrs', {
      peerId,
      peerInfo,
      multiaddrs: multiaddrInfos.map((mi) => mi.multiaddr)
    })

    // Notify the existance of a new peer
    if (!rec) {
      // this._ps.emit('peer', peerId)
      this._ps.emit('peer', peerInfo)
    }

    return this
  }

  /**
   * Transforms received multiaddrs into MultiaddrInfo.
   * @param {Array<Multiaddr>} addresses
   * @returns {Array<MultiaddrInfo>}
   */
  _toMultiaddrInfos (addresses) {
    if (!addresses) {
      log.error('addresses must be provided to store data')
      throw errcode(new Error('addresses must be provided'), ERR_INVALID_PARAMETERS)
    }

    // create MultiaddrInfo for each address
    const multiaddrInfos = []
    addresses.forEach((addr) => {
      if (!multiaddr.isMultiaddr(addr)) {
        log.error(`multiaddr ${addr} must be an instance of multiaddr`)
        throw errcode(new Error(`multiaddr ${addr} must be an instance of multiaddr`), ERR_INVALID_PARAMETERS)
      }

      multiaddrInfos.push({
        multiaddr: addr
      })
    })

    return multiaddrInfos
  }

  _setPeerId (peerId) {
    if (!this._ps.peerIds.get(peerId)) {
      this._ps.peerIds.set(peerId.toString(), peerId)
    }
  }

  /**
   * Get the known multiaddrs for a given peer. All returned multiaddrs
   * will include the encapsulated `PeerId` of the peer.
   * @param {PeerId} peerId
   * @returns {Array<Multiaddr>}
   */
  getMultiaddrsForPeer (peerId) {
    if (!PeerId.isPeerId(peerId)) {
      throw errcode(new Error('peerId must be an instance of peer-id'), ERR_INVALID_PARAMETERS)
    }

    const record = this.data.get(peerId.toB58String())

    if (!record) {
      return undefined
    }

    return record.map((multiaddrInfo) => {
      const addr = multiaddrInfo.multiaddr

      const idString = addr.getPeerId()
      if (idString && idString === peerId.toB58String()) return addr

      return addr.encapsulate(`/p2p/${peerId.toB58String()}`)
    })
  }
}

module.exports = AddressBook
