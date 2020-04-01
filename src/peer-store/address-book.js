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
   * @param {boolean} [options.replace = true] whether addresses received replace stored ones or a unique union is performed.
   * @returns {Array<multiaddrInfo>}
   */
  set (peerId, addresses, { replace = true } = {}) {
    if (!PeerId.isPeerId(peerId)) {
      log.error('peerId must be an instance of peer-id to store data')
      throw errcode(new Error('peerId must be an instance of peer-id'), ERR_INVALID_PARAMETERS)
    }

    if (!addresses) {
      log.error('addresses must be provided to store data')
      throw errcode(new Error('addresses must be provided'), ERR_INVALID_PARAMETERS)
    }

    if (!Array.isArray(addresses)) {
      addresses = [addresses]
    }

    // create multiaddrInfo for each address
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

    if (replace) {
      return this._replace(peerId, multiaddrInfos)
    }

    return this._add(peerId, multiaddrInfos)
  }

  /**
   * Replace known addresses of a provided peer.
   * If the peer is not known, it is set with the given addresses.
   * @param {PeerId} peerId
   * @param {Array<multiaddrInfo>} multiaddrInfos
   * @returns {Array<multiaddrInfo>}
   */
  _replace (peerId, multiaddrInfos) {
    const id = peerId.toString()
    const rec = this.data.get(id)

    // Not replace multiaddrs
    if (!multiaddrInfos.length) {
      return rec ? [...rec] : []
    }

    // Already knows the peer
    if (rec && rec.length === multiaddrInfos.length) {
      const intersection = rec.filter((mi) => multiaddrInfos.some((newMi) => mi.multiaddr.equals(newMi.multiaddr)))

      // Are new addresses equal to the old ones?
      // If yes, no changes needed!
      if (intersection.length === rec.length) {
        log(`the addresses provided to store are equal to the already stored for ${id}`)
        return [...multiaddrInfos]
      }
    }

    this.data.set(id, multiaddrInfos)
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
      return [...multiaddrInfos]
    }

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

      const idString = addr.getPeerId()
      if (idString && idString === peerId.toB58String()) return addr

      return addr.encapsulate(`/p2p/${peerId.toB58String()}`)
    })
  }
}

module.exports = AddressBook
