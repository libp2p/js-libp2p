import type { EventEmitter } from '@libp2p/interfaces/events'
import { PersistentStore, PeerUpdate } from './store.js'
import type { PeerStore, Peer, PeerData } from '@libp2p/interface-peer-store'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { Datastore } from 'interface-datastore'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { Libp2pEvents } from '@libp2p/interface-libp2p'
import { logger } from '@libp2p/logger'

const log = logger('libp2p:peer-store')

export interface PersistentPeerStoreComponents {
  peerId: PeerId
  datastore: Datastore
  events: EventEmitter<Libp2pEvents>
}

/**
 * Return true to allow storing the passed multiaddr for the passed peer
 */
export interface AddressFilter {
  (peerId: PeerId, multiaddr: Multiaddr): Promise<boolean>
}

export interface PersistentPeerStoreInit {
  addressFilter?: AddressFilter
}

/**
 * An implementation of PeerStore that stores data in a Datastore
 */
export class PersistentPeerStore implements PeerStore {
  private readonly store: PersistentStore
  private readonly events: EventEmitter<Libp2pEvents>
  private readonly peerId: PeerId

  constructor (components: PersistentPeerStoreComponents, init: PersistentPeerStoreInit = {}) {
    this.events = components.events
    this.peerId = components.peerId
    this.store = new PersistentStore(components, init)
  }

  async forEach (fn: (peer: Peer) => void): Promise<void> {
    log.trace('forEach await read lock')
    const release = await this.store.lock.readLock()
    log.trace('forEach got read lock')

    try {
      for await (const peer of this.store.all()) {
        fn(peer)
      }
    } finally {
      log.trace('forEach release read lock')
      release()
    }
  }

  async all (): Promise<Peer[]> {
    log.trace('all await read lock')
    const release = await this.store.lock.readLock()
    log.trace('all got read lock')

    try {
      const output: Peer[] = []

      for await (const peer of this.store.all()) {
        output.push(peer)
      }

      return output
    } finally {
      log.trace('all release read lock')
      release()
    }
  }

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

  async save (id: PeerId, data: PeerData): Promise<Peer> {
    log.trace('save await write lock')
    const release = await this.store.lock.writeLock()
    log.trace('save got write lock')

    try {
      const result = await this.store.save(id, data)

      this.#emitIfUpdated(id, result)

      return result.peer
    } finally {
      log.trace('save release write lock')
      release()
    }
  }

  async patch (id: PeerId, data: PeerData): Promise<Peer> {
    log.trace('patch await write lock')
    const release = await this.store.lock.writeLock()
    log.trace('patch got write lock')

    try {
      const result = await this.store.patch(id, data)

      this.#emitIfUpdated(id, result)

      return result.peer
    } finally {
      log.trace('patch release write lock')
      release()
    }
  }

  async merge (id: PeerId, data: PeerData): Promise<Peer> {
    log.trace('merge await write lock')
    const release = await this.store.lock.writeLock()
    log.trace('merge got write lock')

    try {
      const result = await this.store.merge(id, data)

      this.#emitIfUpdated(id, result)

      return result.peer
    } finally {
      log.trace('merge release write lock')
      release()
    }
  }

  #emitIfUpdated (id: PeerId, result: PeerUpdate): void {
    if (!result.updated) {
      return
    }

    if (this.peerId.equals(id)) {
      this.events.safeDispatchEvent('self:peer:update', { detail: result })
    } else {
      this.events.safeDispatchEvent('peer:update', { detail: result })
    }
  }
}
