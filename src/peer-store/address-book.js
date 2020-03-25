'use strict'

const errcode = require('err-code')
const debug = require('debug')
const log = debug('libp2p:peer-store:address-book')
log.error = debug('libp2p:peer-store:address-book:error')

const multiaddr = require('multiaddr')
const PeerId = require('peer-id')

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
   * @typedef {Object} multiaddrInfo
   * @property {Multiaddr} multiaddr peer multiaddr.
   * @property {number} validity NOT USED YET
   * @property {number} confidence NOT USED YET
   */

  /**
  * @constructor
  * @param {EventEmitter} peerStore
  */
  constructor (peerStore) {
    super(peerStore, 'change:multiaddrs', 'multiaddrs')
    /**
     * PeerStore Event emitter, used by the AddressBook to emit:
     * "peer" - emitted when a peer is discovered by the node.
     * "change:multiaddrs" - emitted when the known multiaddrs of a peer change.
     */
    this._ps = peerStore

    /**
     * Map known peers to their known multiaddrs.
     * @type {Map<string, Array<multiaddrInfo>}
     */
    this.data = new Map()
  }

  /**
   * Set known addresses of a provided peer.
   * @param {PeerId} peerId
   * @param {Array<Multiaddr>|Multiaddr} addresses
   * @param {Object} [options]
   * @param {boolean} [options.replace = true] wether addresses received replace stored ones or a unique union is performed.
   * @returns {Array<multiaddrInfo>}
   */
  set (peerId, addresses, { replace = true } = {}) {
    if (!PeerId.isPeerId(peerId)) {
      throw errcode(new Error('peerId must be an instance of peer-id'), ERR_INVALID_PARAMETERS)
    }

    if (!addresses) {
      throw errcode(new Error('addresses must be provided'), ERR_INVALID_PARAMETERS)
    }

    if (!Array.isArray(addresses)) {
      addresses = [addresses]
    }

    // create multiaddrInfo for each address
    const multiaddrInfos = []
    addresses.forEach((addr) => {
      if (!multiaddr.isMultiaddr(addr)) {
        throw errcode(new Error(`multiaddr ${addr} must be an instance of multiaddr`), ERR_INVALID_PARAMETERS)
      }

      multiaddrInfos.push({
        multiaddr: addr
      })
    })

    if (replace) {
      return this._replace(peerId, multiaddrInfos)
    }

    return this._add(peerId, multiaddrInfos)
  }

  /**
   * Replace known addresses to a provided peer.
   * If the peer is not known, it is set with the given addresses.
   * @param {PeerId} peerId
   * @param {Array<multiaddrInfo>} multiaddrInfos
   * @returns {Array<multiaddrInfo>}
   */
  _replace (peerId, multiaddrInfos) {
    const id = peerId.toString()
    const rec = this.data.get(id)

    // Already know the peer
    if (rec && rec.length === multiaddrInfos.length) {
      const intersection = rec.filter((mi) => multiaddrInfos.some((newMi) => mi.multiaddr === newMi.multiaddr))

      // New addresses equal the old ones?
      // If yes, no changes needed!
      if (intersection.length === rec.length) {
        return [...multiaddrInfos]
      }
    }

    this.data.set(id, multiaddrInfos)

    this._ps.emit('peer', peerId)
    this._ps.emit('change:multiaddrs', {
      peerId,
      multiaddrs: multiaddrInfos.map((mi) => mi.multiaddr)
    })

    return [...multiaddrInfos]
  }

  /**
   * Add new known addresses to a provided peer.
   * If the peer is not known, it is set with the given addresses.
   * @param {PeerId} peerId
   * @param {Array<multiaddrInfo>} multiaddrInfos
   * @returns {Array<multiaddrInfo>}
   */
  _add (peerId, multiaddrInfos) {
    const id = peerId.toString()
    const rec = this.data.get(id) || []

    // Add recorded uniquely to the new array
    rec.forEach((mi) => {
      if (!multiaddrInfos.find(r => r.multiaddr === mi.multiaddr)) {
        multiaddrInfos.push(mi)
      }
    })

    // If the recorded length is equal to the new after the uniquely union
    // The content is the same, no need to update.
    if (rec.length === multiaddrInfos.length) {
      return [...multiaddrInfos]
    }

    this.data.set(id, multiaddrInfos)
    this._ps.emit('change:multiaddrs', {
      peerId,
      multiaddrs: multiaddrInfos.map((mi) => mi.multiaddr)
    })

    // Notify the existance of a new peer
    // TODO: do we need this?
    if (!rec) {
      this._ps.emit('peer', peerId)
    }

    return [...multiaddrInfos]
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

    const record = this.data.get(peerId.toString())

    if (!record) {
      return undefined
    }

    return record.map((multiaddrInfo) => {
      const addr = multiaddrInfo.multiaddr

      if (addr.getPeerId()) return addr
      return addr.encapsulate(`/p2p/${peerId.toB58String()}`)
    })
  }
}

module.exports = AddressBook
