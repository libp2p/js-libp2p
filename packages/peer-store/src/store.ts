import { NotFoundError } from '@libp2p/interface'
import { PeerMap, trackedPeerMap } from '@libp2p/peer-collections'
import { peerIdFromCID } from '@libp2p/peer-id'
import mortice from 'mortice'
import { base32 } from 'multiformats/bases/base32'
import { CID } from 'multiformats/cid'
import { MAX_ADDRESS_AGE, MAX_PEER_AGE } from './constants.ts'
import { Peer as PeerPB } from './pb/peer.ts'
import { bytesToPeer, pbToPeer } from './utils/bytes-to-peer.ts'
import { peerEquals } from './utils/peer-equals.ts'
import { NAMESPACE_COMMON, peerIdToDatastoreKey } from './utils/peer-id-to-datastore-key.ts'
import { toPeerPB } from './utils/to-peer-pb.ts'
import type { AddressFilter, PersistentPeerStoreComponents, PersistentPeerStoreInit } from './index.ts'
import type { PeerUpdate as PeerUpdateExternal, PeerId, Peer, PeerData, PeerQuery, Logger, AbortOptions } from '@libp2p/interface'
import type { Datastore, Key, Query } from 'interface-datastore'
import type { Mortice, Release } from 'mortice'

/**
 * Event detail emitted when peer data changes
 */
export interface PeerUpdate extends PeerUpdateExternal {
  updated: boolean
}

export interface ExistingPeer {
  peerPB: PeerPB
  peer: Peer
}

function keyToPeerId (key: Key): PeerId {
  // /peers/${peer-id-as-libp2p-key-cid-string-in-base-32}
  const base32Str = key.toString().split('/')[2]
  const buf = CID.parse(base32Str, base32)

  return peerIdFromCID(buf)
}

function decodePeer (key: Key, value: Uint8Array, maxAddressAge: number): Peer {
  const peerId = keyToPeerId(key)

  return bytesToPeer(peerId, value, maxAddressAge)
}

function mapQuery (query: PeerQuery, maxAddressAge: number): Query {
  return {
    prefix: NAMESPACE_COMMON,
    filters: (query.filters ?? []).map(fn => ({ key, value }) => {
      return fn(decodePeer(key, value, maxAddressAge))
    }),
    orders: (query.orders ?? []).map(fn => (a, b) => {
      return fn(decodePeer(a.key, a.value, maxAddressAge), decodePeer(b.key, b.value, maxAddressAge))
    })
  }
}

export interface Lock {
  refs: number
  lock: Mortice
}

export class PersistentStore {
  private readonly peerId: PeerId
  private readonly datastore: Datastore
  private locks: PeerMap<Lock>
  private readonly addressFilter?: AddressFilter
  private readonly log: Logger
  private readonly maxAddressAge: number
  private readonly maxPeerAge: number

  /**
   * Peers with at least one open connection, each with the generation of its
   * most recent connect so a disconnect that completes after a reconnect does
   * not forget the newer connection
   */
  private readonly connected: PeerMap<number>
  private lastGeneration: number

  constructor (components: PersistentPeerStoreComponents, init: PersistentPeerStoreInit = {}) {
    this.log = components.logger.forComponent('libp2p:peer-store')
    this.peerId = components.peerId
    this.datastore = components.datastore
    this.addressFilter = init.addressFilter
    this.locks = trackedPeerMap({
      name: 'libp2p_peer_store_locks',
      metrics: components.metrics
    })
    this.maxAddressAge = init.maxAddressAge ?? MAX_ADDRESS_AGE
    this.maxPeerAge = init.maxPeerAge ?? MAX_PEER_AGE
    this.connected = new PeerMap()
    this.lastGeneration = 0
  }

  /**
   * Record that `peerId` has an open connection. Until it disconnects its
   * record is not expired, however old its `updated` stamp is
   */
  markConnected (peerId: PeerId): void {
    this.connected.set(peerId, ++this.lastGeneration)
  }

  /**
   * The generation of `peerId`'s current connection, if it has one. Read it
   * when the disconnect is observed and pass it to `markDisconnected`, so a
   * reconnect that happens in between is not mistaken for the closed connection
   */
  connectionGeneration (peerId: PeerId): number | undefined {
    return this.connected.get(peerId)
  }

  /**
   * Record that the connection of `generation` to `peerId` has closed. The
   * record's `updated` stamp is set to now before the peer stops being treated
   * as connected, so its age is measured from the moment it was last known to
   * be live, and a read made while the stamp is being written still finds the
   * record
   */
  async markDisconnected (peerId: PeerId, generation: number | undefined, options?: AbortOptions): Promise<void> {
    try {
      await this.touch(peerId, options)
    } finally {
      if (this.connected.get(peerId) === generation) {
        this.connected.delete(peerId)
      }
    }
  }

  /**
   * Set the stored record's `updated` stamp to now without decoding its
   * addresses. Does nothing if no record is stored
   */
  async touch (peerId: PeerId, options?: AbortOptions): Promise<void> {
    const key = peerIdToDatastoreKey(peerId)
    let peer: PeerPB

    try {
      peer = PeerPB.decode(await this.datastore.get(key, options))
    } catch (err: any) {
      if (err.name === 'NotFoundError') {
        return
      }

      throw err
    }

    peer.updated = Date.now()
    await this.datastore.put(key, PeerPB.encode(peer), options)
  }

  getLock (peerId: PeerId): Lock {
    let lock = this.locks.get(peerId)

    if (lock == null) {
      lock = {
        refs: 0,
        lock: mortice({
          name: peerId.toString(),
          singleProcess: true
        })
      }

      this.locks.set(peerId, lock)
    }

    lock.refs++

    return lock
  }

  private maybeRemoveLock (peerId: PeerId, lock: Lock): void {
    lock.refs--

    if (lock.refs === 0) {
      lock.lock.finalize()
      this.locks.delete(peerId)
    }
  }

  async getReadLock (peerId: PeerId, options?: AbortOptions): Promise<Release> {
    const lock = this.getLock(peerId)

    try {
      const release = await lock.lock.readLock(options)

      return () => {
        release()
        this.maybeRemoveLock(peerId, lock)
      }
    } catch (err) {
      this.maybeRemoveLock(peerId, lock)

      throw err
    }
  }

  async getWriteLock (peerId: PeerId, options?: AbortOptions): Promise<Release> {
    const lock = this.getLock(peerId)

    try {
      const release = await lock.lock.writeLock(options)

      return () => {
        release()
        this.maybeRemoveLock(peerId, lock)
      }
    } catch (err) {
      this.maybeRemoveLock(peerId, lock)

      throw err
    }
  }

  async has (peerId: PeerId, options?: AbortOptions): Promise<boolean> {
    try {
      await this.load(peerId, options)

      return true
    } catch (err: any) {
      if (err.name !== 'NotFoundError') {
        throw err
      }
    }

    return false
  }

  async delete (peerId: PeerId, options?: AbortOptions): Promise<void> {
    if (this.peerId.equals(peerId)) {
      return
    }

    await this.datastore.delete(peerIdToDatastoreKey(peerId), options)
  }

  async load (peerId: PeerId, options?: AbortOptions): Promise<Peer> {
    const key = peerIdToDatastoreKey(peerId)
    const buf = await this.datastore.get(key, options)
    const peer = PeerPB.decode(buf)

    if (this.#peerIsExpired(peerId, peer)) {
      await this.datastore.delete(key, options)
      throw new NotFoundError()
    }

    return pbToPeer(peerId, peer, this.peerId.equals(peerId) ? Infinity : this.maxAddressAge)
  }

  async save (peerId: PeerId, data: PeerData, options?: AbortOptions): Promise<PeerUpdate> {
    const existingPeer = await this.#findExistingPeer(peerId, options)

    const peerPb: PeerPB = await toPeerPB(peerId, data, 'patch', {
      ...options,
      addressFilter: this.addressFilter
    })

    return this.#saveIfDifferent(peerId, peerPb, existingPeer)
  }

  async patch (peerId: PeerId, data: Partial<PeerData>, options?: AbortOptions): Promise<PeerUpdate> {
    const existingPeer = await this.#findExistingPeer(peerId, options)

    const peerPb: PeerPB = await toPeerPB(peerId, data, 'patch', {
      ...options,
      addressFilter: this.addressFilter,
      existingPeer
    })

    return this.#saveIfDifferent(peerId, peerPb, existingPeer)
  }

  async merge (peerId: PeerId, data: PeerData, options?: AbortOptions): Promise<PeerUpdate> {
    const existingPeer = await this.#findExistingPeer(peerId, options)

    const peerPb: PeerPB = await toPeerPB(peerId, data, 'merge', {
      addressFilter: this.addressFilter,
      existingPeer
    })

    return this.#saveIfDifferent(peerId, peerPb, existingPeer)
  }

  async * all (options?: PeerQuery): AsyncGenerator<Peer, void, unknown> {
    for await (const { key, value } of this.datastore.query(mapQuery(options ?? {}, this.maxAddressAge), options)) {
      const peerId = keyToPeerId(key)

      // skip self peer if present
      if (peerId.equals(this.peerId)) {
        continue
      }

      const peer = PeerPB.decode(value)

      // remove expired peer
      if (this.#peerIsExpired(peerId, peer)) {
        await this.datastore.delete(key, options)
        continue
      }

      yield pbToPeer(peerId, peer, this.peerId.equals(peerId) ? Infinity : this.maxAddressAge)
    }
  }

  async #findExistingPeer (peerId: PeerId, options?: AbortOptions): Promise<ExistingPeer | undefined> {
    try {
      const key = peerIdToDatastoreKey(peerId)
      const buf = await this.datastore.get(key, options)
      const peerPB = PeerPB.decode(buf)

      // remove expired peer
      if (this.#peerIsExpired(peerId, peerPB)) {
        await this.datastore.delete(key, options)
        throw new NotFoundError()
      }

      return {
        peerPB,
        peer: pbToPeer(peerId, peerPB, this.maxAddressAge)
      }
    } catch (err: any) {
      if (err.name !== 'NotFoundError') {
        this.log.error('invalid peer data found in peer store - %e', err)
      }
    }
  }

  async #saveIfDifferent (peerId: PeerId, peer: PeerPB, existingPeer?: ExistingPeer, options?: AbortOptions): Promise<PeerUpdate> {
    // record last update
    peer.updated = Date.now()
    const buf = PeerPB.encode(peer)

    await this.datastore.put(peerIdToDatastoreKey(peerId), buf, options)

    return {
      peer: pbToPeer(peerId, peer, this.maxAddressAge),
      previous: existingPeer?.peer,
      updated: existingPeer == null || !peerEquals(peer, existingPeer.peerPB)
    }
  }

  #peerIsExpired (peerId: PeerId, peer: PeerPB): boolean {
    if (peer.updated == null) {
      return true
    }

    if (this.peerId.equals(peerId)) {
      return false
    }

    // an open connection is proof the peer is live
    if (this.connected.has(peerId)) {
      return false
    }

    const expired = peer.updated < (Date.now() - this.maxPeerAge)
    const minAddressObserved = Date.now() - this.maxAddressAge
    const addrs = peer.addresses.filter(addr => {
      return addr.observed != null && addr.observed > minAddressObserved
    })

    return expired && addrs.length === 0
  }
}
