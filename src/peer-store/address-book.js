'use strict'

const errcode = require('err-code')
const debug = require('debug')
const log = debug('libp2p:peer-store:address-book')
log.error = debug('libp2p:peer-store:address-book:error')

const multiaddr = require('multiaddr')
const PeerId = require('peer-id')

const Book = require('./book')

const {
  codes: { ERR_INVALID_PARAMETERS }
} = require('../errors')

/**
 * The AddressBook is responsible for keeping the known multiaddrs
 * of a peer.
 */
class AddressBook extends Book {
  /**
   * Address object
   * @typedef {Object} Address
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
    super({
      peerStore,
      eventName: 'change:multiaddrs',
      eventProperty: 'multiaddrs',
      eventTransformer: (data) => data.map((address) => address.multiaddr)
    })

    /**
     * Map known peers to their known Addresses.
     * @type {Map<string, Array<Address>>}
     */
    this.data = new Map()
  }

  /**
   * Set known multiaddrs of a provided peer.
   * @override
   * @param {PeerId} peerId
   * @param {Array<Multiaddr>} multiaddrs
   * @returns {AddressBook}
   */
  set (peerId, multiaddrs) {
    if (!PeerId.isPeerId(peerId)) {
      log.error('peerId must be an instance of peer-id to store data')
      throw errcode(new Error('peerId must be an instance of peer-id'), ERR_INVALID_PARAMETERS)
    }

    const addresses = this._toAddresses(multiaddrs)
    const id = peerId.toB58String()
    const rec = this.data.get(id)

    // Not replace multiaddrs
    if (!addresses.length) {
      return this
    }

    // Already knows the peer
    if (rec && rec.length === addresses.length) {
      const intersection = rec.filter((mi) => addresses.some((newMi) => mi.multiaddr.equals(newMi.multiaddr)))

      // Are new addresses equal to the old ones?
      // If yes, no changes needed!
      if (intersection.length === rec.length) {
        log(`the addresses provided to store are equal to the already stored for ${id}`)
        return this
      }
    }

    this._setData(peerId, addresses)
    log(`stored provided multiaddrs for ${id}`)

    // Notify the existance of a new peer
    if (!rec) {
      this._ps.emit('peer', peerId)
    }

    return this
  }

  /**
   * Add known addresses of a provided peer.
   * If the peer is not known, it is set with the given addresses.
   * @param {PeerId} peerId
   * @param {Array<Multiaddr>} multiaddrs
   * @returns {AddressBook}
   */
  add (peerId, multiaddrs) {
    if (!PeerId.isPeerId(peerId)) {
      log.error('peerId must be an instance of peer-id to store data')
      throw errcode(new Error('peerId must be an instance of peer-id'), ERR_INVALID_PARAMETERS)
    }

    const addresses = this._toAddresses(multiaddrs)
    const id = peerId.toB58String()
    const rec = this.data.get(id)

    // Add recorded uniquely to the new array (Union)
    rec && rec.forEach((mi) => {
      if (!addresses.find(r => r.multiaddr.equals(mi.multiaddr))) {
        addresses.push(mi)
      }
    })

    // If the recorded length is equal to the new after the unique union
    // The content is the same, no need to update.
    if (rec && rec.length === addresses.length) {
      log(`the addresses provided to store are already stored for ${id}`)
      return this
    }

    this._setData(peerId, addresses)

    log(`added provided multiaddrs for ${id}`)

    // Notify the existance of a new peer
    if (!rec) {
      this._ps.emit('peer', peerId)
    }

    return this
  }

  /**
   * Transforms received multiaddrs into Address.
   * @private
   * @param {Array<Multiaddr>} multiaddrs
   * @returns {Array<Address>}
   */
  _toAddresses (multiaddrs) {
    if (!multiaddrs) {
      log.error('multiaddrs must be provided to store data')
      throw errcode(new Error('multiaddrs must be provided'), ERR_INVALID_PARAMETERS)
    }

    // create Address for each address
    const addresses = []
    multiaddrs.forEach((addr) => {
      if (!multiaddr.isMultiaddr(addr)) {
        log.error(`multiaddr ${addr} must be an instance of multiaddr`)
        throw errcode(new Error(`multiaddr ${addr} must be an instance of multiaddr`), ERR_INVALID_PARAMETERS)
      }

      addresses.push({
        multiaddr: addr
      })
    })

    return addresses
  }

  /**
   * Get the known multiaddrs for a given peer. All returned multiaddrs
   * will include the encapsulated `PeerId` of the peer.
   * Returns `undefined` if there are no known multiaddrs for the given peer.
   * @param {PeerId} peerId
   * @returns {Array<Multiaddr>|undefined}
   */
  getMultiaddrsForPeer (peerId) {
    if (!PeerId.isPeerId(peerId)) {
      throw errcode(new Error('peerId must be an instance of peer-id'), ERR_INVALID_PARAMETERS)
    }

    const record = this.data.get(peerId.toB58String())

    if (!record) {
      return undefined
    }

    return record.map((address) => {
      const multiaddr = address.multiaddr

      const idString = multiaddr.getPeerId()
      if (idString && idString === peerId.toB58String()) return multiaddr

      return multiaddr.encapsulate(`/p2p/${peerId.toB58String()}`)
    })
  }
}

module.exports = AddressBook
