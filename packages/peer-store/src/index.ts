/**
 * @packageDocumentation
 *
 * The peer store is where libp2p stores data about the peers it has encountered on the network.
 */

import { peerIdFromCID } from '@libp2p/peer-id'
import { RecordEnvelope, PeerRecord } from '@libp2p/peer-record'
import all from 'it-all'
import { PersistentStore, type PeerUpdate } from './store.js'
import type { ComponentLogger, Libp2pEvents, Logger, TypedEventTarget, PeerId, PeerStore, Peer, PeerData, PeerQuery } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { Datastore } from 'interface-datastore'

export interface PersistentPeerStoreComponents {
  peerId: PeerId
  datastore: Datastore
  events: TypedEventTarget<Libp2pEvents>
  logger: ComponentLogger
}

/**
 * Return true to allow storing the passed multiaddr for the passed peer
 */
export interface AddressFilter {
  (peerId: PeerId, multiaddr: Multiaddr): Promise<boolean> | boolean
}

export interface PersistentPeerStoreInit {
  /**
   * Used to remove multiaddrs of peers before storing them. The default is to
   * store all addresses
   */
  addressFilter?: AddressFilter

  /**
   * The multiaddrs for a given peer will expire after this number of ms after
   * which they must be re-fetched using the peer routing.
   *
   * Defaults to one hour.
   *
   * @default 3_600_000
   */
  maxAddressAge?: number

  /**
   * Any peer without multiaddrs that has not been updated after this number of
   * ms will be evicted from the peer store.
   *
   * Defaults to six hours.
   *
   * @default 21_600_000
   */
  maxPeerAge?: number
}

/**
 * An implementation of PeerStore that stores data in a Datastore
 */
class PersistentPeerStore implements PeerStore {
  private readonly store: PersistentStore
  private readonly events: TypedEventTarget<Libp2pEvents>
  private readonly peerId: PeerId
  private readonly log: Logger

  constructor (components: PersistentPeerStoreComponents, init: PersistentPeerStoreInit = {}) {
    this.log = components.logger.forComponent('libp2p:peer-store')
    this.events = components.events
    this.peerId = components.peerId
    this.store = new PersistentStore(components, init)
  }

  readonly [Symbol.toStringTag] = '@libp2p/peer-store'

  async forEach (fn: (peer: Peer,) => void, query?: PeerQuery): Promise<void> {
    this.log.trace('forEach await read lock')
    const release = await this.store.lock.readLock()
    this.log.trace('forEach got read lock')

    try {
      for await (const peer of this.store.all(query)) {
        fn(peer)
      }
    } finally {
      this.log.trace('forEach release read lock')
      release()
    }
  }

  async all (query?: PeerQuery): Promise<Peer[]> {
    this.log.trace('all await read lock')
    const release = await this.store.lock.readLock()
    this.log.trace('all got read lock')

    try {
      return await all(this.store.all(query))
    } finally {
      this.log.trace('all release read lock')
      release()
    }
  }

  async delete (peerId: PeerId): Promise<void> {
    this.log.trace('delete await write lock')
    const release = await this.store.lock.writeLock()
    this.log.trace('delete got write lock')

    try {
      await this.store.delete(peerId)
    } finally {
      this.log.trace('delete release write lock')
      release()
    }
  }

  async has (peerId: PeerId): Promise<boolean> {
    this.log.trace('has await read lock')
    const release = await this.store.lock.readLock()
    this.log.trace('has got read lock')

    try {
      return await this.store.has(peerId)
    } finally {
      this.log.trace('has release read lock')
      release()
    }
  }

  async get (peerId: PeerId): Promise<Peer> {
    this.log.trace('get await read lock')
    const release = await this.store.lock.readLock()
    this.log.trace('get got read lock')

    try {
      return await this.store.load(peerId)
    } finally {
      this.log.trace('get release read lock')
      release()
    }
  }

  async save (id: PeerId, data: PeerData): Promise<Peer> {
    this.log.trace('save await write lock')
    const release = await this.store.lock.writeLock()
    this.log.trace('save got write lock')

    try {
      const result = await this.store.save(id, data)

      this.#emitIfUpdated(id, result)

      return result.peer
    } finally {
      this.log.trace('save release write lock')
      release()
    }
  }

  async patch (id: PeerId, data: PeerData): Promise<Peer> {
    this.log.trace('patch await write lock')
    const release = await this.store.lock.writeLock()
    this.log.trace('patch got write lock')

    try {
      const result = await this.store.patch(id, data)

      this.#emitIfUpdated(id, result)

      return result.peer
    } finally {
      this.log.trace('patch release write lock')
      release()
    }
  }

  async merge (id: PeerId, data: PeerData): Promise<Peer> {
    this.log.trace('merge await write lock')
    const release = await this.store.lock.writeLock()
    this.log.trace('merge got write lock')

    try {
      const result = await this.store.merge(id, data)

      this.#emitIfUpdated(id, result)

      return result.peer
    } finally {
      this.log.trace('merge release write lock')
      release()
    }
  }

  async consumePeerRecord (buf: Uint8Array, expectedPeer?: PeerId): Promise<boolean> {
    const envelope = await RecordEnvelope.openAndCertify(buf, PeerRecord.DOMAIN)
    const peerId = peerIdFromCID(envelope.publicKey.toCID())

    if (expectedPeer?.equals(peerId) === false) {
      this.log('envelope peer id was not the expected peer id - expected: %p received: %p', expectedPeer, peerId)
      return false
    }

    const peerRecord = PeerRecord.createFromProtobuf(envelope.payload)
    let peer: Peer | undefined

    try {
      peer = await this.get(peerId)
    } catch (err: any) {
      if (err.name !== 'NotFoundError') {
        throw err
      }
    }

    // ensure seq is greater than, or equal to, the last received
    if (peer?.peerRecordEnvelope != null) {
      const storedEnvelope = await RecordEnvelope.createFromProtobuf(peer.peerRecordEnvelope)
      const storedRecord = PeerRecord.createFromProtobuf(storedEnvelope.payload)

      if (storedRecord.seqNumber >= peerRecord.seqNumber) {
        this.log('sequence number was lower or equal to existing sequence number - stored: %d received: %d', storedRecord.seqNumber, peerRecord.seqNumber)
        return false
      }
    }

    await this.patch(peerRecord.peerId, {
      peerRecordEnvelope: buf,
      addresses: peerRecord.multiaddrs.map(multiaddr => ({
        isCertified: true,
        multiaddr
      }))
    })

    return true
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

export function persistentPeerStore (components: PersistentPeerStoreComponents, init: PersistentPeerStoreInit = {}): PeerStore {
  return new PersistentPeerStore(components, init)
}
