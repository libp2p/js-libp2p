'use strict'

const debug = require('debug')
const errcode = require('err-code')
const { Multiaddr } = require('multiaddr')
const PeerId = require('peer-id')
const { codes } = require('../errors')
const PeerRecord = require('../record/peer-record')
const Envelope = require('../record/envelope')

/**
 * @typedef {import('./types').PeerStore} PeerStore
 * @typedef {import('./types').Address} Address
 * @typedef {import('./types').AddressBook} AddressBook
 */

const log = Object.assign(debug('libp2p:peer-store:address-book'), {
  error: debug('libp2p:peer-store:address-book:err')
})

const EVENT_NAME = 'change:multiaddrs'

/**
 * @implements {AddressBook}
 */
class PeerStoreAddressBook {
  /**
   * @param {PeerStore["emit"]} emit
   * @param {import('./types').Store} store
   */
  constructor (emit, store) {
    this._emit = emit
    this._store = store
  }

  /**
   * ConsumePeerRecord adds addresses from a signed peer record contained in a record envelope.
   * This will return a boolean that indicates if the record was successfully processed and added
   * into the AddressBook.
   *
   * @param {Envelope} envelope
   */
  async consumePeerRecord (envelope) {
    log('consumePeerRecord await write lock')
    const release = await this._store.lock.writeLock()
    log('consumePeerRecord got write lock')

    let peerId
    let multiaddrs

    try {
      let peerRecord
      try {
        peerRecord = PeerRecord.createFromProtobuf(envelope.payload)
      } catch (/** @type {any} */ err) {
        log.error('invalid peer record received')
        return false
      }

      peerId = peerRecord.peerId
      multiaddrs = peerRecord.multiaddrs

      // Verify peerId
      if (!peerId.equals(envelope.peerId)) {
        log('signing key does not match PeerId in the PeerRecord')
        return false
      }

      // ensure the record has multiaddrs
      if (!multiaddrs || !multiaddrs.length) {
        return false
      }

      if (await this._store.has(peerId)) {
        const peer = await this._store.load(peerId)

        if (peer.peerRecordEnvelope) {
          const storedEnvelope = await Envelope.createFromProtobuf(peer.peerRecordEnvelope)
          const storedRecord = PeerRecord.createFromProtobuf(storedEnvelope.payload)

          // ensure seq is greater than, or equal to, the last received
          if (storedRecord.seqNumber >= peerRecord.seqNumber) {
            return false
          }
        }
      }

      // Replace unsigned addresses by the new ones from the record
      // TODO: Once we have ttls for the addresses, we should merge these in.
      await this._store.merge(peerId, {
        addresses: convertMultiaddrsToAddresses(multiaddrs, true),
        peerRecordEnvelope: envelope.marshal()
      })

      log(`stored provided peer record for ${peerRecord.peerId.toB58String()}`)
    } finally {
      log('consumePeerRecord release write lock')
      release()
    }

    this._emit(EVENT_NAME, { peerId, multiaddrs })

    return true
  }

  /**
   * @param {PeerId} peerId
   */
  async getRawEnvelope (peerId) {
    log('getRawEnvelope await read lock')
    const release = await this._store.lock.readLock()
    log('getRawEnvelope got read lock')

    try {
      const peer = await this._store.load(peerId)

      return peer.peerRecordEnvelope
    } finally {
      log('getRawEnvelope release read lock')
      release()
    }
  }

  /**
   * Get an Envelope containing a PeerRecord for the given peer.
   * Returns undefined if no record exists.
   *
   * @param {PeerId} peerId
   */
  async getPeerRecord (peerId) {
    const raw = await this.getRawEnvelope(peerId)

    if (!raw) {
      return undefined
    }

    return Envelope.createFromProtobuf(raw)
  }

  /**
   * @param {PeerId} peerId
   */
  async get (peerId) {
    log('get wait for read lock')
    const release = await this._store.lock.readLock()
    log('get got read lock')

    try {
      if (!PeerId.isPeerId(peerId)) {
        throw errcode(new Error('peerId must be an instance of peer-id'), codes.ERR_INVALID_PARAMETERS)
      }

      const peer = await this._store.load(peerId)

      return peer.addresses
    } finally {
      log('get release read lock')
      release()
    }
  }

  /**
   * @param {PeerId} peerId
   * @param {Multiaddr[]} multiaddrs
   */
  async set (peerId, multiaddrs) {
    log('set await write lock')
    const release = await this._store.lock.writeLock()
    log('set got write lock')

    let has

    try {
      if (!PeerId.isPeerId(peerId)) {
        log.error('peerId must be an instance of peer-id to store data')
        throw errcode(new Error('peerId must be an instance of peer-id'), codes.ERR_INVALID_PARAMETERS)
      }

      const addresses = convertMultiaddrsToAddresses(multiaddrs)

      // Not replace multiaddrs
      if (!addresses.length) {
        return
      }

      has = await this._store.has(peerId)

      if (has) {
        const peer = await this._store.load(peerId)
        const intersection = new Set([...peer.addresses.map(addr => addr.multiaddr.toString()), ...multiaddrs.map(addr => addr.toString())])

        // Are new addresses equal to the old ones?
        // If yes, no changes needed!
        if (intersection.size === multiaddrs.length) {
          log(`the addresses provided to store are equal to the already stored for ${peerId.toB58String()}`)
          return
        }
      }

      await this._store.merge(peerId, { addresses })

      log(`set multiaddrs for ${peerId.toB58String()}`)
    } finally {
      log('set release write lock')
      release()
    }

    this._emit(EVENT_NAME, { peerId, multiaddrs })

    // Notify the existence of a new peer
    if (!has) {
      this._emit('peer', peerId)
    }
  }

  /**
   * @param {PeerId} peerId
   * @param {Multiaddr[]} multiaddrs
   */
  async add (peerId, multiaddrs) {
    log('add await write lock')
    const release = await this._store.lock.writeLock()
    log('add got write lock')

    let newPeer

    try {
      if (!PeerId.isPeerId(peerId)) {
        log.error('peerId must be an instance of peer-id to store data')
        throw errcode(new Error('peerId must be an instance of peer-id'), codes.ERR_INVALID_PARAMETERS)
      }

      const addresses = convertMultiaddrsToAddresses(multiaddrs)
      const id = peerId.toB58String()

      // No addresses to be added
      if (!addresses.length) {
        return
      }

      newPeer = !(await this._store.has(peerId))

      const {
        addresses: knownAddresses
      } = await this._store.load(peerId)

      // Add recorded uniquely to the new array (Union)
      knownAddresses.forEach((addr) => {
        if (!addresses.find(r => r.multiaddr.equals(addr.multiaddr))) {
          addresses.push(addr)
        }
      })

      // If the recorded length is equal to the new after the unique union
      // the content is the same, no need to update
      if (knownAddresses.length === addresses.length) {
        log(`the addresses provided to store are already stored for ${id}`)
        return
      }

      multiaddrs = addresses.map(addr => addr.multiaddr)

      await this._store.merge(peerId, { addresses })

      log(`added multiaddrs for ${id}`)
    } finally {
      log('set release write lock')
      release()
    }

    this._emit(EVENT_NAME, { peerId, multiaddrs })

    // Notify the existence of a new peer
    if (newPeer) {
      this._emit('peer', peerId)
    }
  }

  /**
   * @param {PeerId} peerId
   */
  async delete (peerId) {
    log('delete await write lock')
    const release = await this._store.lock.writeLock()
    log('delete got write lock')

    let has

    try {
      has = await this._store.has(peerId)

      if (has) {
        await this._store.merge(peerId, {
          addresses: []
        })
      }
    } finally {
      log('delete release write lock')
      release()
    }

    if (has) {
      this._emit(EVENT_NAME, { peerId, multiaddrs: [] })
    }
  }

  /**
   * @param {PeerId} peerId
   * @param {(addresses: Address[]) => Address[]} [addressSorter]
   */
  async getMultiaddrsForPeer (peerId, addressSorter = (ms) => ms) {
    const addresses = await this.get(peerId)

    return addressSorter(
      addresses
    ).map((address) => {
      const multiaddr = address.multiaddr

      const idString = multiaddr.getPeerId()
      if (idString && idString === peerId.toB58String()) return multiaddr

      return multiaddr.encapsulate(`/p2p/${peerId.toB58String()}`)
    })
  }
}

/**
 * Transforms received multiaddrs into Address.
 *
 * @private
 * @param {Multiaddr[]} multiaddrs
 * @param {boolean} [isCertified]
 */
function convertMultiaddrsToAddresses (multiaddrs, isCertified = false) {
  if (!multiaddrs) {
    log.error('multiaddrs must be provided to store data')
    throw errcode(new Error('multiaddrs must be provided'), codes.ERR_INVALID_PARAMETERS)
  }

  // create Address for each address
  /** @type {Address[]} */
  const addresses = []
  multiaddrs.forEach((addr) => {
    if (!Multiaddr.isMultiaddr(addr)) {
      log.error(`multiaddr ${addr} must be an instance of multiaddr`)
      throw errcode(new Error(`multiaddr ${addr} must be an instance of multiaddr`), codes.ERR_INVALID_PARAMETERS)
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

module.exports = PeerStoreAddressBook
