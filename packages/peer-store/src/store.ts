import { NotFoundError } from '@libp2p/interface'
import { peerIdFromCID } from '@libp2p/peer-id'
import mortice, { type Mortice } from 'mortice'
import { base32 } from 'multiformats/bases/base32'
import { CID } from 'multiformats/cid'
import { MAX_ADDRESS_AGE, MAX_PEER_AGE } from './constants.js'
import { Peer as PeerPB } from './pb/peer.js'
import { bytesToPeer, pbToPeer } from './utils/bytes-to-peer.js'
import { peerEquals } from './utils/peer-equals.js'
import { NAMESPACE_COMMON, peerIdToDatastoreKey } from './utils/peer-id-to-datastore-key.js'
import { toPeerPB } from './utils/to-peer-pb.js'
import type { AddressFilter, PersistentPeerStoreComponents, PersistentPeerStoreInit } from './index.js'
import type { PeerUpdate as PeerUpdateExternal, PeerId, Peer, PeerData, PeerQuery, Logger } from '@libp2p/interface'
import type { Datastore, Key, Query } from 'interface-datastore'

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

export class PersistentStore {
  private readonly peerId: PeerId
  private readonly datastore: Datastore
  public readonly lock: Mortice
  private readonly addressFilter?: AddressFilter
  private readonly log: Logger
  private readonly maxAddressAge: number
  private readonly maxPeerAge: number

  constructor (components: PersistentPeerStoreComponents, init: PersistentPeerStoreInit = {}) {
    this.log = components.logger.forComponent('libp2p:peer-store')
    this.peerId = components.peerId
    this.datastore = components.datastore
    this.addressFilter = init.addressFilter
    this.lock = mortice({
      name: 'peer-store',
      singleProcess: true
    })
    this.maxAddressAge = init.maxAddressAge ?? MAX_ADDRESS_AGE
    this.maxPeerAge = init.maxPeerAge ?? MAX_PEER_AGE
  }

  async has (peerId: PeerId): Promise<boolean> {
    try {
      await this.load(peerId)

      return true
    } catch (err: any) {
      if (err.name !== 'NotFoundError') {
        throw err
      }
    }

    return false
  }

  async delete (peerId: PeerId): Promise<void> {
    if (this.peerId.equals(peerId)) {
      return
    }

    await this.datastore.delete(peerIdToDatastoreKey(peerId))
  }

  async load (peerId: PeerId): Promise<Peer> {
    const key = peerIdToDatastoreKey(peerId)
    const buf = await this.datastore.get(key)
    const peer = PeerPB.decode(buf)

    if (this.#peerIsExpired(peer)) {
      await this.datastore.delete(key)
      throw new NotFoundError()
    }

    return pbToPeer(peerId, peer, this.maxAddressAge)
  }

  async save (peerId: PeerId, data: PeerData): Promise<PeerUpdate> {
    const existingPeer = await this.#findExistingPeer(peerId)

    const peerPb: PeerPB = await toPeerPB(peerId, data, 'patch', {
      addressFilter: this.addressFilter
    })

    return this.#saveIfDifferent(peerId, peerPb, existingPeer)
  }

  async patch (peerId: PeerId, data: Partial<PeerData>): Promise<PeerUpdate> {
    const existingPeer = await this.#findExistingPeer(peerId)

    const peerPb: PeerPB = await toPeerPB(peerId, data, 'patch', {
      addressFilter: this.addressFilter,
      existingPeer
    })

    return this.#saveIfDifferent(peerId, peerPb, existingPeer)
  }

  async merge (peerId: PeerId, data: PeerData): Promise<PeerUpdate> {
    const existingPeer = await this.#findExistingPeer(peerId)

    const peerPb: PeerPB = await toPeerPB(peerId, data, 'merge', {
      addressFilter: this.addressFilter,
      existingPeer
    })

    return this.#saveIfDifferent(peerId, peerPb, existingPeer)
  }

  async * all (query?: PeerQuery): AsyncGenerator<Peer, void, unknown> {
    for await (const { key, value } of this.datastore.query(mapQuery(query ?? {}, this.maxAddressAge))) {
      const peerId = keyToPeerId(key)

      // skip self peer if present
      if (peerId.equals(this.peerId)) {
        continue
      }

      const peer = PeerPB.decode(value)

      // remove expired peer
      if (this.#peerIsExpired(peer)) {
        await this.datastore.delete(key)
        continue
      }

      yield pbToPeer(peerId, peer, this.maxAddressAge)
    }
  }

  async #findExistingPeer (peerId: PeerId): Promise<ExistingPeer | undefined> {
    try {
      const key = peerIdToDatastoreKey(peerId)
      const buf = await this.datastore.get(key)
      const peerPB = PeerPB.decode(buf)

      // remove expired peer
      if (this.#peerIsExpired(peerPB)) {
        await this.datastore.delete(key)
        throw new NotFoundError()
      }

      return {
        peerPB,
        peer: bytesToPeer(peerId, buf, this.maxAddressAge)
      }
    } catch (err: any) {
      if (err.name !== 'NotFoundError') {
        this.log.error('invalid peer data found in peer store - %e', err)
      }
    }
  }

  async #saveIfDifferent (peerId: PeerId, peer: PeerPB, existingPeer?: ExistingPeer): Promise<PeerUpdate> {
    // record last update
    peer.updated = Date.now()
    const buf = PeerPB.encode(peer)

    await this.datastore.put(peerIdToDatastoreKey(peerId), buf)

    return {
      peer: bytesToPeer(peerId, buf, this.maxAddressAge),
      previous: existingPeer?.peer,
      updated: existingPeer == null || !peerEquals(peer, existingPeer.peerPB)
    }
  }

  #peerIsExpired (peer: PeerPB): boolean {
    if (peer.updated == null) {
      return true
    }

    const expired = peer.updated < (Date.now() - this.maxPeerAge)
    const minAddressObserved = Date.now() - this.maxAddressAge
    const addrs = peer.addresses.filter(addr => {
      return addr.observed != null && addr.observed > minAddressObserved
    })

    return expired && addrs.length === 0
  }
}
