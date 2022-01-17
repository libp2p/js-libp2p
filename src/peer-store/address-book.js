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
    let updatedPeer

    try {
      let peerRecord
      try {
        peerRecord = PeerRecord.createFromProtobuf(envelope.payload)
      } catch (/** @type {any} */ err) {
        log.error('invalid peer record received')
        return false
      }

      peerId = peerRecord.peerId
      const multiaddrs = peerRecord.multiaddrs

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
      // TODO: Once we have ttls for the addresses, we should merge these in
      updatedPeer = await this._store.patchOrCreate(peerId, {
        addresses: convertMultiaddrsToAddresses(multiaddrs, true),
        peerRecordEnvelope: envelope.marshal()
      })

      log(`stored provided peer record for ${peerRecord.peerId.toB58String()}`)
    } finally {
      log('consumePeerRecord release write lock')
      release()
    }

    this._emit(EVENT_NAME, { peerId, multiaddrs: updatedPeer.addresses.map(({ multiaddr }) => multiaddr) })

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
    if (!PeerId.isPeerId(peerId)) {
      log.error('peerId must be an instance of peer-id to store data')
      throw errcode(new Error('peerId must be an instance of peer-id'), codes.ERR_INVALID_PARAMETERS)
    }

    log('get wait for read lock')
    const release = await this._store.lock.readLock()
    log('get got read lock')

    try {
      const peer = await this._store.load(peerId)

      return peer.addresses
    } catch (/** @type {any} */ err) {
      if (err.code !== codes.ERR_NOT_FOUND) {
        throw err
      }
    } finally {
      log('get release read lock')
      release()
    }

    return []
  }

  /**
   * @param {PeerId} peerId
   * @param {Multiaddr[]} multiaddrs
   */
  async set (peerId, multiaddrs) {
    if (!PeerId.isPeerId(peerId)) {
      log.error('peerId must be an instance of peer-id to store data')
      throw errcode(new Error('peerId must be an instance of peer-id'), codes.ERR_INVALID_PARAMETERS)
    }

    log('set await write lock')
    const release = await this._store.lock.writeLock()
    log('set got write lock')

    let hasPeer = false
    let updatedPeer

    try {
      const addresses = convertMultiaddrsToAddresses(multiaddrs)

      // No valid addresses found
      if (!addresses.length) {
        return
      }

      try {
        const peer = await this._store.load(peerId)
        hasPeer = true

        if (new Set([
          ...addresses.map(({ multiaddr }) => multiaddr.toString()),
          ...peer.addresses.map(({ multiaddr }) => multiaddr.toString())
        ]).size === peer.addresses.length && addresses.length === peer.addresses.length) {
          // not changing anything, no need to update
          return
        }
      } catch (/** @type {any} */ err) {
        if (err.code !== codes.ERR_NOT_FOUND) {
          throw err
        }
      }

      updatedPeer = await this._store.patchOrCreate(peerId, { addresses })

      log(`set multiaddrs for ${peerId.toB58String()}`)
    } finally {
      log('set release write lock')
      release()
    }

    this._emit(EVENT_NAME, { peerId, multiaddrs: updatedPeer.addresses.map(addr => addr.multiaddr) })

    // Notify the existence of a new peer
    if (!hasPeer) {
      this._emit('peer', peerId)
    }
  }

  /**
   * @param {PeerId} peerId
   * @param {Multiaddr[]} multiaddrs
   */
  async add (peerId, multiaddrs) {
    if (!PeerId.isPeerId(peerId)) {
      log.error('peerId must be an instance of peer-id to store data')
      throw errcode(new Error('peerId must be an instance of peer-id'), codes.ERR_INVALID_PARAMETERS)
    }

    log('add await write lock')
    const release = await this._store.lock.writeLock()
    log('add got write lock')

    let hasPeer
    let updatedPeer

    try {
      const addresses = convertMultiaddrsToAddresses(multiaddrs)

      // No valid addresses found
      if (!addresses.length) {
        return
      }

      try {
        const peer = await this._store.load(peerId)
        hasPeer = true

        if (new Set([
          ...addresses.map(({ multiaddr }) => multiaddr.toString()),
          ...peer.addresses.map(({ multiaddr }) => multiaddr.toString())
        ]).size === peer.addresses.length) {
          return
        }
      } catch (/** @type {any} */ err) {
        if (err.code !== codes.ERR_NOT_FOUND) {
          throw err
        }
      }

      updatedPeer = await this._store.mergeOrCreate(peerId, { addresses })

      log(`added multiaddrs for ${peerId}`)
    } finally {
      log('set release write lock')
      release()
    }

    this._emit(EVENT_NAME, { peerId, multiaddrs: updatedPeer.addresses.map(addr => addr.multiaddr) })

    // Notify the existence of a new peer
    if (!hasPeer) {
      this._emit('peer', peerId)
    }
  }

  /**
   * @param {PeerId} peerId
   */
  async delete (peerId) {
    if (!PeerId.isPeerId(peerId)) {
      log.error('peerId must be an instance of peer-id to store data')
      throw errcode(new Error('peerId must be an instance of peer-id'), codes.ERR_INVALID_PARAMETERS)
    }

    log('delete await write lock')
    const release = await this._store.lock.writeLock()
    log('delete got write lock')

    let has

    try {
      has = await this._store.has(peerId)

      await this._store.patchOrCreate(peerId, {
        addresses: []
      })
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
 * @returns {Address[]}
 */
function convertMultiaddrsToAddresses (multiaddrs, isCertified = false) {
  if (!multiaddrs) {
    log.error('multiaddrs must be provided to store data')
    throw errcode(new Error('multiaddrs must be provided'), codes.ERR_INVALID_PARAMETERS)
  }

  // create Address for each address with no duplicates
  return Array.from(
    new Set(multiaddrs.map(ma => ma.toString()))
  )
    .map(addr => {
      try {
        return {
          multiaddr: new Multiaddr(addr),
          isCertified
        }
      } catch (err) {
        throw errcode(err, codes.ERR_INVALID_PARAMETERS)
      }
    })
}

module.exports = PeerStoreAddressBook
