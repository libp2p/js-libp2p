'use strict'

const debug = require('debug')
const log = Object.assign(debug('libp2p:persistent-peer-store'), {
  error: debug('libp2p:persistent-peer-store:err')
})
const { Key } = require('interface-datastore/key')
const { Multiaddr } = require('multiaddr')
const PeerId = require('peer-id')
const { base32 } = require('multiformats/bases/base32')

const PeerStore = require('..')

const {
  NAMESPACE_ADDRESS,
  NAMESPACE_COMMON,
  NAMESPACE_KEYS,
  NAMESPACE_METADATA,
  NAMESPACE_PROTOCOL
} = require('./consts')

const { Addresses } = require('./pb/address-book')
const { Protocols } = require('./pb/proto-book')

/**
 * @typedef {import('interface-datastore').Batch} Batch
 * @typedef {import('../address-book.js').Address} Address
 */

/**
 * @typedef {Object} PersistentPeerStoreProperties
 * @property {PeerId} peerId
 * @property {import('interface-datastore').Datastore} datastore
 *
 * @typedef {Object} PersistentPeerStoreOptions
 * @property {number} [threshold = 5] - Number of dirty peers allowed before commit data.
 */

/**
 * Responsible for managing the persistence of data in the PeerStore.
 */
class PersistentPeerStore extends PeerStore {
  /**
   * @class
   * @param {PersistentPeerStoreProperties & PersistentPeerStoreOptions} properties
   */
  constructor ({ peerId, datastore, threshold = 5 }) {
    super({ peerId })

    /**
     * Backend datastore used to persist data.
     */
    this._datastore = datastore

    /**
     * Peers modified after the latest data persisted.
     */
    this._dirtyPeers = new Set()

    /**
     * Peers metadata changed mapping peer identifers to metadata changed.
     *
     * @type {Map<string, Set<string>>}
     */
    this._dirtyMetadata = new Map()

    this.threshold = threshold
    this._addDirtyPeer = this._addDirtyPeer.bind(this)
  }

  /**
   * Start Persistent PeerStore.
   *
   * @returns {Promise<void>}
   */
  async start () {
    log('PeerStore is starting')

    // Handlers for dirty peers
    this.on('change:protocols', this._addDirtyPeer)
    this.on('change:multiaddrs', this._addDirtyPeer)
    this.on('change:pubkey', this._addDirtyPeerKey)
    this.on('change:metadata', this._addDirtyPeerMetadata)

    // Load data
    for await (const entry of this._datastore.query({ prefix: NAMESPACE_COMMON })) {
      await this._processDatastoreEntry(entry)
    }

    log('PeerStore started')
  }

  /**
   * Stop Persistent PeerStore.
   *
   * @returns {Promise<void>}
   */
  async stop () {
    log('PeerStore is stopping')
    this.removeAllListeners()
    await this._commitData()
    log('PeerStore stopped')
  }

  /**
   * Add modified peer to the dirty set
   *
   * @private
   * @param {Object} params
   * @param {PeerId} params.peerId
   */
  _addDirtyPeer ({ peerId }) {
    const peerIdstr = peerId.toB58String()

    log('add dirty peer', peerIdstr)
    this._dirtyPeers.add(peerIdstr)

    if (this._dirtyPeers.size >= this.threshold) {
      // Commit current data
      this._commitData().catch(err => {
        log.error('error committing data', err)
      })
    }
  }

  /**
   * Add modified peer key to the dirty set
   *
   * @private
   * @param {Object} params
   * @param {PeerId} params.peerId
   */
  _addDirtyPeerKey ({ peerId }) {
    // Not add if inline key available
    if (peerId.hasInlinePublicKey()) {
      return
    }

    const peerIdstr = peerId.toB58String()

    log('add dirty peer key', peerIdstr)
    this._dirtyPeers.add(peerIdstr)

    if (this._dirtyPeers.size >= this.threshold) {
      // Commit current data
      this._commitData().catch(err => {
        log.error('error committing data', err)
      })
    }
  }

  /**
   * Add modified metadata peer to the set.
   *
   * @private
   * @param {Object} params
   * @param {PeerId} params.peerId
   * @param {string} params.metadata
   */
  _addDirtyPeerMetadata ({ peerId, metadata }) {
    const peerIdstr = peerId.toB58String()

    log('add dirty metadata peer', peerIdstr)
    this._dirtyPeers.add(peerIdstr)

    // Add dirty metadata key
    const mData = this._dirtyMetadata.get(peerIdstr) || new Set()
    mData.add(metadata)
    this._dirtyMetadata.set(peerIdstr, mData)

    if (this._dirtyPeers.size >= this.threshold) {
      // Commit current data
      this._commitData().catch(err => {
        log.error('error committing data', err)
      })
    }
  }

  /**
   * Add all the peers current data to a datastore batch and commit it.
   *
   * @private
   * @returns {Promise<void>}
   */
  async _commitData () {
    const commitPeers = Array.from(this._dirtyPeers)

    if (!commitPeers.length) {
      return
    }

    // Clear Dirty Peers set
    this._dirtyPeers.clear()

    log('create batch commit')
    const batch = this._datastore.batch()
    for (const peerIdStr of commitPeers) {
      // PeerId
      const peerId = this.keyBook.data.get(peerIdStr) || PeerId.createFromB58String(peerIdStr)

      // Address Book
      this._batchAddressBook(peerId, batch)

      // Key Book
      !peerId.hasInlinePublicKey() && this._batchKeyBook(peerId, batch)

      // Metadata Book
      this._batchMetadataBook(peerId, batch)

      // Proto Book
      this._batchProtoBook(peerId, batch)
    }

    await batch.commit()
    log('batch committed')
  }

  /**
   * Add address book data of the peer to the batch.
   *
   * @private
   * @param {PeerId} peerId
   * @param {Batch} batch
   */
  _batchAddressBook (peerId, batch) {
    const b32key = peerId.toString()
    const key = new Key(`${NAMESPACE_ADDRESS}${b32key}`)

    const entry = this.addressBook.data.get(peerId.toB58String())

    try {
      // Deleted from the book
      if (!entry) {
        batch.delete(key)
        return
      }

      const encodedData = Addresses.encode({
        addrs: entry.addresses.map((address) => ({
          multiaddr: address.multiaddr.bytes,
          isCertified: address.isCertified
        })),
        certifiedRecord: entry.record
          ? {
              seq: entry.record.seqNumber,
              raw: entry.record.raw
            }
          : undefined
      }).finish()

      batch.put(key, encodedData)
    } catch (err) {
      log.error(err)
    }
  }

  /**
   * Add Key book data of the peer to the batch.
   *
   * @private
   * @param {PeerId} peerId
   * @param {Batch} batch
   */
  _batchKeyBook (peerId, batch) {
    const b32key = peerId.toString()
    const key = new Key(`${NAMESPACE_KEYS}${b32key}`)

    try {
      // Deleted from the book
      if (!peerId.pubKey) {
        batch.delete(key)
        return
      }

      const encodedData = peerId.marshalPubKey()

      batch.put(key, encodedData)
    } catch (err) {
      log.error(err)
    }
  }

  /**
   * Add metadata book data of the peer to the batch.
   *
   * @private
   * @param {PeerId} peerId
   * @param {Batch} batch
   */
  _batchMetadataBook (peerId, batch) {
    const b32key = peerId.toString()
    const dirtyMetada = this._dirtyMetadata.get(peerId.toB58String()) || []

    try {
      dirtyMetada.forEach((/** @type {string} */ dirtyKey) => {
        const key = new Key(`${NAMESPACE_METADATA}${b32key}/${dirtyKey}`)
        const dirtyValue = this.metadataBook.getValue(peerId, dirtyKey)

        if (dirtyValue) {
          batch.put(key, dirtyValue)
        } else {
          batch.delete(key)
        }
      })
    } catch (err) {
      log.error(err)
    }
  }

  /**
   * Add proto book data of the peer to the batch.
   *
   * @private
   * @param {PeerId} peerId
   * @param {Batch} batch
   */
  _batchProtoBook (peerId, batch) {
    const b32key = peerId.toString()
    const key = new Key(`${NAMESPACE_PROTOCOL}${b32key}`)

    const protocols = this.protoBook.get(peerId)

    try {
      // Deleted from the book
      if (!protocols) {
        batch.delete(key)
        return
      }

      const encodedData = Protocols.encode({ protocols }).finish()

      batch.put(key, encodedData)
    } catch (err) {
      log.error(err)
    }
  }

  /**
   * Process datastore entry and add its data to the correct book.
   *
   * @private
   * @param {Object} params
   * @param {Key} params.key - datastore key
   * @param {Uint8Array} params.value - datastore value stored
   * @returns {Promise<void>}
   */
  async _processDatastoreEntry ({ key, value }) {
    try {
      const keyParts = key.toString().split('/')
      const peerId = PeerId.createFromBytes(base32.decode(keyParts[3]))

      let decoded
      switch (keyParts[2]) {
        case 'addrs':
          decoded = Addresses.decode(value)

          // @ts-ignore protected function
          this.addressBook._setData(
            peerId,
            {
              addresses: decoded.addrs.map((address) => ({
                multiaddr: new Multiaddr(address.multiaddr),
                isCertified: Boolean(address.isCertified)
              })),
              record: decoded.certifiedRecord
                ? {
                    raw: decoded.certifiedRecord.raw,
                    seqNumber: decoded.certifiedRecord.seq
                  }
                : undefined
            },
            { emit: false })
          break
        case 'keys':
          decoded = await PeerId.createFromPubKey(value)

          // @ts-ignore protected function
          this.keyBook._setData(
            decoded,
            decoded,
            { emit: false })
          break
        case 'metadata':
          this.metadataBook._setValue(
            peerId,
            keyParts[4],
            value,
            { emit: false })
          break
        case 'protos':
          decoded = Protocols.decode(value)

          // @ts-ignore protected function
          this.protoBook._setData(
            peerId,
            new Set(decoded.protocols),
            { emit: false })
          break
        default:
          log('invalid data persisted for: ', key.toString())
      }
    } catch (err) {
      log.error(err)
    }
  }
}

module.exports = PersistentPeerStore
