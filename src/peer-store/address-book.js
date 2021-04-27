'use strict'

const debug = require('debug')
const log = Object.assign(debug('libp2p:peer-store:address-book'), {
  error: debug('libp2p:peer-store:address-book:err')
})
const errcode = require('err-code')

const { Multiaddr } = require('multiaddr')
const PeerId = require('peer-id')

const Book = require('./book')
const PeerRecord = require('../record/peer-record')

const {
  codes: { ERR_INVALID_PARAMETERS }
} = require('../errors')
const Envelope = require('../record/envelope')

/**
 * @typedef {import('./')} PeerStore
 */

/**
 * @typedef {Object} Address
 * @property {Multiaddr} multiaddr peer multiaddr.
 * @property {boolean} isCertified obtained from a signed peer record.
 *
 * @typedef {Object} CertifiedRecord
 * @property {Uint8Array} raw raw envelope.
 * @property {number} seqNumber seq counter.
 *
 * @typedef {Object} Entry
 * @property {Address[]} addresses peer Addresses.
 * @property {CertifiedRecord} record certified peer record.
 */

/**
 * @extends {Book}
 */
class AddressBook extends Book {
  /**
   * The AddressBook is responsible for keeping the known multiaddrs of a peer.
   *
   * @class
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
      eventTransformer: (data) => {
        if (!data.addresses) {
          return []
        }
        return data.addresses.map((/** @type {Address} */ address) => address.multiaddr)
      }
    })

    /**
     * Map known peers to their known Address Entries.
     *
     * @type {Map<string, Entry>}
     */
    this.data = new Map()
  }

  /**
   * ConsumePeerRecord adds addresses from a signed peer record contained in a record envelope.
   * This will return a boolean that indicates if the record was successfully processed and added
   * into the AddressBook.
   *
   * @param {Envelope} envelope
   * @returns {boolean}
   */
  consumePeerRecord (envelope) {
    let peerRecord
    try {
      peerRecord = PeerRecord.createFromProtobuf(envelope.payload)
    } catch (err) {
      log.error('invalid peer record received')
      return false
    }

    // Verify peerId
    if (!peerRecord.peerId.equals(envelope.peerId)) {
      log('signing key does not match PeerId in the PeerRecord')
      return false
    }

    // ensure the record has multiaddrs
    if (!peerRecord.multiaddrs || !peerRecord.multiaddrs.length) {
      return false
    }

    const peerId = peerRecord.peerId
    const id = peerId.toB58String()
    const entry = this.data.get(id) || { record: undefined }
    const storedRecord = entry.record

    // ensure seq is greater than, or equal to, the last received
    if (storedRecord && storedRecord.seqNumber >= peerRecord.seqNumber) {
      return false
    }

    const addresses = this._toAddresses(peerRecord.multiaddrs, true)

    // Replace unsigned addresses by the new ones from the record
    // TODO: Once we have ttls for the addresses, we should merge these in.
    this._setData(peerId, {
      addresses,
      record: {
        raw: envelope.marshal(),
        seqNumber: peerRecord.seqNumber
      }
    })
    log(`stored provided peer record for ${id}`)

    return true
  }

  /**
   * Get the raw Envelope for a peer. Returns
   * undefined if no Envelope is found.
   *
   * @param {PeerId} peerId
   * @returns {Uint8Array|undefined}
   */
  getRawEnvelope (peerId) {
    const entry = this.data.get(peerId.toB58String())

    if (!entry || !entry.record || !entry.record.raw) {
      return undefined
    }

    return entry.record.raw
  }

  /**
   * Get an Envelope containing a PeerRecord for the given peer.
   * Returns undefined if no record exists.
   *
   * @param {PeerId} peerId
   * @returns {Promise<Envelope|void>|undefined}
   */
  getPeerRecord (peerId) {
    const raw = this.getRawEnvelope(peerId)

    if (!raw) {
      return undefined
    }

    return Envelope.createFromProtobuf(raw)
  }

  /**
   * Set known multiaddrs of a provided peer.
   * This will replace previously stored multiaddrs, if available.
   * Replacing stored multiaddrs might result in losing obtained certified addresses.
   * If you are not sure, it's recommended to use `add` instead.
   *
   * @override
   * @param {PeerId} peerId
   * @param {Multiaddr[]} multiaddrs
   * @returns {AddressBook}
   */
  set (peerId, multiaddrs) {
    if (!PeerId.isPeerId(peerId)) {
      log.error('peerId must be an instance of peer-id to store data')
      throw errcode(new Error('peerId must be an instance of peer-id'), ERR_INVALID_PARAMETERS)
    }

    const addresses = this._toAddresses(multiaddrs)

    // Not replace multiaddrs
    if (!addresses.length) {
      return this
    }

    const id = peerId.toB58String()
    const entry = this.data.get(id)

    // Already knows the peer
    if (entry && entry.addresses && entry.addresses.length === addresses.length) {
      const intersection = entry.addresses.filter((addr) => addresses.some((newAddr) => addr.multiaddr.equals(newAddr.multiaddr)))

      // Are new addresses equal to the old ones?
      // If yes, no changes needed!
      if (intersection.length === entry.addresses.length) {
        log(`the addresses provided to store are equal to the already stored for ${id}`)
        return this
      }
    }

    this._setData(peerId, {
      addresses,
      record: entry && entry.record
    })
    log(`stored provided multiaddrs for ${id}`)

    // Notify the existance of a new peer
    if (!entry) {
      this._ps.emit('peer', peerId)
    }

    return this
  }

  /**
   * Add known addresses of a provided peer.
   * If the peer is not known, it is set with the given addresses.
   *
   * @param {PeerId} peerId
   * @param {Multiaddr[]} multiaddrs
   * @returns {AddressBook}
   */
  add (peerId, multiaddrs) {
    if (!PeerId.isPeerId(peerId)) {
      log.error('peerId must be an instance of peer-id to store data')
      throw errcode(new Error('peerId must be an instance of peer-id'), ERR_INVALID_PARAMETERS)
    }

    const addresses = this._toAddresses(multiaddrs)
    const id = peerId.toB58String()

    // No addresses to be added
    if (!addresses.length) {
      return this
    }

    const entry = this.data.get(id)

    if (entry && entry.addresses) {
      // Add recorded uniquely to the new array (Union)
      entry.addresses.forEach((addr) => {
        if (!addresses.find(r => r.multiaddr.equals(addr.multiaddr))) {
          addresses.push(addr)
        }
      })

      // If the recorded length is equal to the new after the unique union
      // The content is the same, no need to update.
      if (entry.addresses.length === addresses.length) {
        log(`the addresses provided to store are already stored for ${id}`)
        return this
      }
    }

    this._setData(peerId, {
      addresses,
      record: entry && entry.record
    })

    log(`added provided multiaddrs for ${id}`)

    // Notify the existance of a new peer
    if (!(entry && entry.addresses)) {
      this._ps.emit('peer', peerId)
    }

    return this
  }

  /**
   * Get the known data of a provided peer.
   *
   * @override
   * @param {PeerId} peerId
   * @returns {Address[]|undefined}
   */
  get (peerId) {
    if (!PeerId.isPeerId(peerId)) {
      throw errcode(new Error('peerId must be an instance of peer-id'), ERR_INVALID_PARAMETERS)
    }

    const entry = this.data.get(peerId.toB58String())

    return entry && entry.addresses ? [...entry.addresses] : undefined
  }

  /**
   * Transforms received multiaddrs into Address.
   *
   * @private
   * @param {Multiaddr[]} multiaddrs
   * @param {boolean} [isCertified]
   * @returns {Address[]}
   */
  _toAddresses (multiaddrs, isCertified = false) {
    if (!multiaddrs) {
      log.error('multiaddrs must be provided to store data')
      throw errcode(new Error('multiaddrs must be provided'), ERR_INVALID_PARAMETERS)
    }

    // create Address for each address
    /** @type {Address[]} */
    const addresses = []
    multiaddrs.forEach((addr) => {
      if (!Multiaddr.isMultiaddr(addr)) {
        log.error(`multiaddr ${addr} must be an instance of multiaddr`)
        throw errcode(new Error(`multiaddr ${addr} must be an instance of multiaddr`), ERR_INVALID_PARAMETERS)
      }

      // Guarantee no replicates
      if (!addresses.find((a) => a.multiaddr.equals(addr))) {
        addresses.push({
          multiaddr: addr,
          isCertified
        })
      }
    })

    return addresses
  }

  /**
   * Get the known multiaddrs for a given peer. All returned multiaddrs
   * will include the encapsulated `PeerId` of the peer.
   * Returns `undefined` if there are no known multiaddrs for the given peer.
   *
   * @param {PeerId} peerId
   * @param {(addresses: Address[]) => Address[]} [addressSorter]
   * @returns {Multiaddr[]|undefined}
   */
  getMultiaddrsForPeer (peerId, addressSorter = (ms) => ms) {
    if (!PeerId.isPeerId(peerId)) {
      throw errcode(new Error('peerId must be an instance of peer-id'), ERR_INVALID_PARAMETERS)
    }

    const entry = this.data.get(peerId.toB58String())
    if (!entry || !entry.addresses) {
      return undefined
    }

    return addressSorter(
      entry.addresses || []
    ).map((address) => {
      const multiaddr = address.multiaddr

      const idString = multiaddr.getPeerId()
      if (idString && idString === peerId.toB58String()) return multiaddr

      return multiaddr.encapsulate(`/p2p/${peerId.toB58String()}`)
    })
  }
}

module.exports = AddressBook
