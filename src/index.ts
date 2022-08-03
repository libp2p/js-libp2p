import { logger } from '@libp2p/logger'
import { EventEmitter } from '@libp2p/interfaces/events'
import { PeerStoreAddressBook } from './address-book.js'
import { PeerStoreKeyBook } from './key-book.js'
import { PeerStoreMetadataBook } from './metadata-book.js'
import { PeerStoreProtoBook } from './proto-book.js'
import { PersistentStore, Store } from './store.js'
import type { PeerStore, AddressBook, KeyBook, MetadataBook, ProtoBook, PeerStoreEvents, PeerStoreInit, Peer, TagOptions } from '@libp2p/interface-peer-store'
import type { PeerId } from '@libp2p/interface-peer-id'
import { Components, Initializable } from '@libp2p/components'
import errCode from 'err-code'
import { Tag, Tags } from './pb/tags.js'

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

  async tagPeer (peerId: PeerId, tag: string, options: TagOptions = {}) {
    const providedValue = options.value ?? 0
    const value = Math.round(providedValue)
    const ttl = options.ttl ?? undefined

    if (value !== providedValue || value < 0 || value > 100) {
      throw errCode(new Error('Tag value must be between 0-100'), 'ERR_TAG_VALUE_OUT_OF_BOUNDS')
    }

    const buf = await this.metadataBook.getValue(peerId, 'tags')
    let tags: Tag[] = []

    if (buf != null) {
      tags = Tags.decode(buf).tags
    }

    for (const t of tags) {
      if (t.name === tag) {
        throw errCode(new Error('Peer already tagged'), 'ERR_DUPLICATE_TAG')
      }
    }

    tags.push({
      name: tag,
      value,
      expiry: ttl == null ? undefined : BigInt(Date.now() + ttl)
    })

    await this.metadataBook.setValue(peerId, 'tags', Tags.encode({ tags }).subarray())
  }

  async unTagPeer (peerId: PeerId, tag: string) {
    const buf = await this.metadataBook.getValue(peerId, 'tags')
    let tags: Tag[] = []

    if (buf != null) {
      tags = Tags.decode(buf).tags
    }

    tags = tags.filter(t => t.name !== tag)

    await this.metadataBook.setValue(peerId, 'tags', Tags.encode({ tags }).subarray())
  }

  async getTags (peerId: PeerId) {
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
