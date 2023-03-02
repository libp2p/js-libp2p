import { logger } from '@libp2p/logger'
import { EventEmitter } from '@libp2p/interfaces/events'
import { PeerStoreAddressBook } from './address-book.js'
import { PeerStoreKeyBook } from './key-book.js'
import { PeerStoreMetadataBook } from './metadata-book.js'
import { PeerStoreProtoBook } from './proto-book.js'
import { PersistentStore, Store } from './store.js'
import type { PeerStore, AddressBook, KeyBook, MetadataBook, ProtoBook, PeerStoreEvents, PeerStoreInit, Peer, TagOptions } from '@libp2p/interface-peer-store'
import type { PeerId } from '@libp2p/interface-peer-id'
import { CodeError } from '@libp2p/interfaces/errors'
import { Tag, Tags } from './pb/tags.js'
import type { Datastore } from 'interface-datastore'

const log = logger('libp2p:peer-store')

export interface PersistentPeerStoreComponents {
  peerId: PeerId
  datastore: Datastore
}

/**
 * An implementation of PeerStore that stores data in a Datastore
 */
export class PersistentPeerStore extends EventEmitter<PeerStoreEvents> implements PeerStore {
  public addressBook: AddressBook
  public keyBook: KeyBook
  public metadataBook: MetadataBook
  public protoBook: ProtoBook

  private readonly components: PersistentPeerStoreComponents
  private readonly store: Store

  constructor (components: PersistentPeerStoreComponents, init: PeerStoreInit = {}) {
    super()

    this.components = components
    this.store = new PersistentStore(components)
    this.addressBook = new PeerStoreAddressBook(this.dispatchEvent.bind(this), this.store, init.addressFilter)
    this.keyBook = new PeerStoreKeyBook(this.dispatchEvent.bind(this), this.store)
    this.metadataBook = new PeerStoreMetadataBook(this.dispatchEvent.bind(this), this.store)
    this.protoBook = new PeerStoreProtoBook(this.dispatchEvent.bind(this), this.store)
  }

  async forEach (fn: (peer: Peer) => void): Promise<void> {
    log.trace('getPeers await read lock')
    const release = await this.store.lock.readLock()
    log.trace('getPeers got read lock')

    try {
      for await (const peer of this.store.all()) {
        if (peer.id.equals(this.components.peerId)) {
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
  async delete (peerId: PeerId): Promise<void> {
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
  async get (peerId: PeerId): Promise<Peer> {
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
  async has (peerId: PeerId): Promise<boolean> {
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

  async tagPeer (peerId: PeerId, tag: string, options: TagOptions = {}): Promise<void> {
    const providedValue = options.value ?? 0
    const value = Math.round(providedValue)
    const ttl = options.ttl ?? undefined

    if (value !== providedValue || value < 0 || value > 100) {
      throw new CodeError('Tag value must be between 0-100', 'ERR_TAG_VALUE_OUT_OF_BOUNDS')
    }

    const buf = await this.metadataBook.getValue(peerId, 'tags')
    let tags: Tag[] = []

    if (buf != null) {
      tags = Tags.decode(buf).tags
    }

    // do not allow duplicate tags
    tags = tags.filter(t => t.name !== tag)

    tags.push({
      name: tag,
      value,
      expiry: ttl == null ? undefined : BigInt(Date.now() + ttl)
    })

    await this.metadataBook.setValue(peerId, 'tags', Tags.encode({ tags }).subarray())
  }

  async unTagPeer (peerId: PeerId, tag: string): Promise<void> {
    const buf = await this.metadataBook.getValue(peerId, 'tags')
    let tags: Tag[] = []

    if (buf != null) {
      tags = Tags.decode(buf).tags
    }

    tags = tags.filter(t => t.name !== tag)

    await this.metadataBook.setValue(peerId, 'tags', Tags.encode({ tags }).subarray())
  }

  async getTags (peerId: PeerId): Promise<Array<{ name: string, value: number }>> {
    const buf = await this.metadataBook.getValue(peerId, 'tags')
    let tags: Tag[] = []

    if (buf != null) {
      tags = Tags.decode(buf).tags
    }

    const now = BigInt(Date.now())
    const unexpiredTags = tags.filter(tag => tag.expiry == null || tag.expiry > now)

    if (unexpiredTags.length !== tags.length) {
      // remove any expired tags
      await this.metadataBook.setValue(peerId, 'tags', Tags.encode({ tags: unexpiredTags }).subarray())
    }

    return unexpiredTags.map(t => ({
      name: t.name,
      value: t.value ?? 0
    }))
  }
}
