import { logger } from '@libp2p/logger'
import { EventEmitter } from '@libp2p/interfaces/events'
import { PeerStoreAddressBook } from './address-book.js'
import { PeerStoreKeyBook } from './key-book.js'
import { PeerStoreMetadataBook } from './metadata-book.js'
import { PeerStoreProtoBook } from './proto-book.js'
import { PersistentStore, Store } from './store.js'
import type { PeerStore, AddressBook, KeyBook, MetadataBook, ProtoBook, PeerStoreEvents, PeerStoreInit, Peer } from '@libp2p/interfaces/peer-store'
import type { PeerId } from '@libp2p/interfaces/peer-id'
import { Components, Initializable } from '@libp2p/interfaces/components'

const log = logger('libp2p:peer-store')

/**
 * An implementation of PeerStore that stores data in a Datastore
 */
export class PersistentPeerStore extends EventEmitter<PeerStoreEvents> implements PeerStore, Initializable {
  public addressBook: AddressBook
  public keyBook: KeyBook
  public metadataBook: MetadataBook
  public protoBook: ProtoBook

  private components: Components = new Components()
  private readonly store: Store

  constructor (init: PeerStoreInit = {}) {
    super()

    this.store = new PersistentStore()
    this.addressBook = new PeerStoreAddressBook(this.dispatchEvent.bind(this), this.store, init.addressFilter)
    this.keyBook = new PeerStoreKeyBook(this.dispatchEvent.bind(this), this.store)
    this.metadataBook = new PeerStoreMetadataBook(this.dispatchEvent.bind(this), this.store)
    this.protoBook = new PeerStoreProtoBook(this.dispatchEvent.bind(this), this.store)
  }

  init (components: Components) {
    this.components = components
    ;(this.store as PersistentStore).init(components)
  }

  async forEach (fn: (peer: Peer) => void) {
    log.trace('getPeers await read lock')
    const release = await this.store.lock.readLock()
    log.trace('getPeers got read lock')

    try {
      for await (const peer of this.store.all()) {
        if (peer.id.equals(this.components.getPeerId())) {
          // Skip self peer if present
          continue
        }

        fn(peer)
      }
    } finally {
      log.trace('getPeers release read lock')
      release()
    }
  }

  async all (): Promise<Peer[]> {
    const output: Peer[] = []

    await this.forEach(peer => {
      output.push(peer)
    })

    return output
  }

  /**
   * Delete the information of the given peer in every book
   */
  async delete (peerId: PeerId) {
    log.trace('delete await write lock')
    const release = await this.store.lock.writeLock()
    log.trace('delete got write lock')

    try {
      await this.store.delete(peerId)
    } finally {
      log.trace('delete release write lock')
      release()
    }
  }

  /**
   * Get the stored information of a given peer
   */
  async get (peerId: PeerId) {
    log.trace('get await read lock')
    const release = await this.store.lock.readLock()
    log.trace('get got read lock')

    try {
      return await this.store.load(peerId)
    } finally {
      log.trace('get release read lock')
      release()
    }
  }

  /**
   * Returns true if we have a record of the peer
   */
  async has (peerId: PeerId) {
    log.trace('has await read lock')
    const release = await this.store.lock.readLock()
    log.trace('has got read lock')

    try {
      return await this.store.has(peerId)
    } finally {
      log.trace('has release read lock')
      release()
    }
  }
}
