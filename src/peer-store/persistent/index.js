'use strict'

const debug = require('debug')
const log = debug('libp2p:persistent-peer-store')
log.error = debug('libp2p:persistent-peer-store:error')

const { Key } = require('interface-datastore')
const multiaddr = require('multiaddr')
const PeerId = require('peer-id')

const PeerStore = require('..')

const {
  NAMESPACE_ADDRESS,
  NAMESPACE_COMMON,
  NAMESPACE_KEYS,
  NAMESPACE_PROTOCOL
} = require('./consts')

const Addresses = require('./pb/address-book.proto')
const Protocols = require('./pb/proto-book.proto')

/**
 * Responsible for managing the persistence of data in the PeerStore.
 */
class PersistentPeerStore extends PeerStore {
  /**
   * @constructor
   * @param {Object} properties
   * @param {Datastore} properties.datastore Datastore to persist data.
   * @param {number} [properties.threshold = 5] Number of dirty peers allowed before commit data.
   */
  constructor ({ datastore, threshold = 5 }) {
    super()

    /**
     * Backend datastore used to persist data.
     */
    this._datastore = datastore

    /**
     * Peers modified after the latest data persisted.
     */
    this._dirtyPeers = new Set()

    this.threshold = threshold
    this._addDirtyPeer = this._addDirtyPeer.bind(this)
  }

  /**
   * Start Persistent PeerStore.
   * @return {Promise<void>}
   */
  async start () {
    log('PeerStore is starting')

    // Handlers for dirty peers
    this.on('change:protocols', this._addDirtyPeer)
    this.on('change:multiaddrs', this._addDirtyPeer)
    this.on('change:pubkey', this._addDirtyPeer)

    // Load data
    for await (const entry of this._datastore.query({ prefix: NAMESPACE_COMMON })) {
      await this._processDatastoreEntry(entry)
    }

    log('PeerStore started')
  }

  async stop () {
    log('PeerStore is stopping')
    this.removeAllListeners()
    await this._commitData()
    log('PeerStore stopped')
  }

  /**
   * Add modified peer to the dirty set
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
      this._commitData()
    }
  }

  /**
   * Add all the peers current data to a datastore batch and commit it.
   * @private
   * @param {Array<string>} peers
   * @return {Promise<void>}
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
      const peerId = this.keyBook.data.get(peerIdStr) || PeerId.createFromCID(peerIdStr)

      // Address Book
      this._batchAddressBook(peerId, batch)

      // Key Book
      this._batchKeyBook(peerId, batch)

      // Proto Book
      this._batchProtoBook(peerId, batch)
    }

    await batch.commit()
    log('batch committed')
  }

  /**
   * Add address book data of the peer to the batch.
   * @private
   * @param {PeerId} peerId
   * @param {Object} batch
   */
  _batchAddressBook (peerId, batch) {
    const b32key = peerId.toString()
    const key = new Key(`${NAMESPACE_ADDRESS}${b32key}`)

    const addresses = this.addressBook.get(peerId)

    try {
      // Deleted from the book
      if (!addresses) {
        batch.delete(key)
        return
      }

      const encodedData = Addresses.encode({
        addrs: addresses.map((address) => ({
          multiaddr: address.multiaddr.buffer
        }))
      })

      batch.put(key, encodedData)
    } catch (err) {
      log.error(err)
    }
  }

  /**
   * Add Key book data of the peer to the batch.
   * @private
   * @param {PeerId} peerId
   * @param {Object} batch
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
   * Add proto book data of the peer to the batch.
   * @private
   * @param {PeerId} peerId
   * @param {Object} batch
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

      const encodedData = Protocols.encode({ protocols })

      batch.put(key, encodedData)
    } catch (err) {
      log.error(err)
    }
  }

  /**
   * Process datastore entry and add its data to the correct book.
   * @private
   * @param {Object} params
   * @param {Key} params.key datastore key
   * @param {Buffer} params.value datastore value stored
   * @return {Promise<void>}
   */
  async _processDatastoreEntry ({ key, value }) {
    try {
      const keyParts = key.toString().split('/')
      const peerId = PeerId.createFromCID(keyParts[3])

      let decoded
      switch (keyParts[2]) {
        case 'addrs':
          decoded = Addresses.decode(value)

          this.addressBook._setData(
            peerId,
            decoded.addrs.map((address) => ({
              multiaddr: multiaddr(address.multiaddr)
            })),
            { emit: false })
          break
        case 'keys':
          decoded = await PeerId.createFromPubKey(value)

          this.keyBook._setData(
            decoded,
            decoded,
            { emit: false })
          break
        case 'protos':
          decoded = Protocols.decode(value)

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
