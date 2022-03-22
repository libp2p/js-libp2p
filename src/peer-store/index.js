'use strict'

const debug = require('debug')
const { EventEmitter } = require('events')
const AddressBook = require('./address-book')
const KeyBook = require('./key-book')
const MetadataBook = require('./metadata-book')
const ProtoBook = require('./proto-book')
const Store = require('./store')

/**
 * @typedef {import('./types').PeerStore} PeerStore
 * @typedef {import('./types').Peer} Peer
 * @typedef {import('peer-id')} PeerId
 * @typedef {import('multiaddr').Multiaddr} Multiaddr
 */

const log = Object.assign(debug('libp2p:peer-store'), {
  error: debug('libp2p:peer-store:err')
})

/**
 * An implementation of PeerStore that stores data in a Datastore
 *
 * @implements {PeerStore}
 */
class DefaultPeerStore extends EventEmitter {
  /**
   * @param {object} properties
   * @param {PeerId} properties.peerId
   * @param {import('interface-datastore').Datastore} properties.datastore
   * @param {(peerId: PeerId, multiaddr: Multiaddr) => Promise<boolean>} properties.addressFilter
   */
  constructor ({ peerId, datastore, addressFilter }) {
    super()

    this._peerId = peerId
    this._store = new Store(datastore)

    this.addressBook = new AddressBook(this.emit.bind(this), this._store, addressFilter)
    this.keyBook = new KeyBook(this.emit.bind(this), this._store)
    this.metadataBook = new MetadataBook(this.emit.bind(this), this._store)
    this.protoBook = new ProtoBook(this.emit.bind(this), this._store)
  }

  async * getPeers () {
    log('getPeers await read lock')
    const release = await this._store.lock.readLock()
    log('getPeers got read lock')

    try {
      for await (const peer of this._store.all()) {
        if (peer.id.toB58String() === this._peerId.toB58String()) {
          // Remove self peer if present
          continue
        }

        yield peer
      }
    } finally {
      log('getPeers release read lock')
      release()
    }
  }

  /**
   * Delete the information of the given peer in every book
   *
   * @param {PeerId} peerId
   */
  async delete (peerId) {
    log('delete await write lock')
    const release = await this._store.lock.writeLock()
    log('delete got write lock')

    try {
      await this._store.delete(peerId)
    } finally {
      log('delete release write lock')
      release()
    }
  }

  /**
   * Get the stored information of a given peer
   *
   * @param {PeerId} peerId
   */
  async get (peerId) {
    log('get await read lock')
    const release = await this._store.lock.readLock()
    log('get got read lock')

    try {
      return this._store.load(peerId)
    } finally {
      log('get release read lock')
      release()
    }
  }

  /**
   * Returns true if we have a record of the peer
   *
   * @param {PeerId} peerId
   */
  async has (peerId) {
    log('has await read lock')
    const release = await this._store.lock.readLock()
    log('has got read lock')

    try {
      return this._store.has(peerId)
    } finally {
      log('has release read lock')
      release()
    }
  }
}

module.exports = DefaultPeerStore
