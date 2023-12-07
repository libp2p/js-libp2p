import { CodeError } from '@libp2p/interface'
import { PeerMap } from '@libp2p/peer-collections'
import { peerIdFromBytes } from '@libp2p/peer-id'
import mortice, { type Mortice } from 'mortice'
import { base32 } from 'multiformats/bases/base32'
import { equals as uint8ArrayEquals } from 'uint8arrays/equals'
import { codes } from './errors.js'
import { Peer as PeerPB } from './pb/peer.js'
import { bytesToPeer } from './utils/bytes-to-peer.js'
import { NAMESPACE_COMMON, peerIdToDatastoreKey } from './utils/peer-id-to-datastore-key.js'
import { toPeerPB } from './utils/to-peer-pb.js'
import type { AddressFilter, PersistentPeerStoreComponents, PersistentPeerStoreInit } from './index.js'
import type { PeerUpdate as PeerUpdateExternal, PeerId, Peer, PeerData, PeerQuery } from '@libp2p/interface'
import type { Datastore, Key, Query } from 'interface-datastore'

/**
 * Event detail emitted when peer data changes
 */
export interface PeerUpdate extends PeerUpdateExternal {
  updated: boolean
}

function decodePeer (key: Key, value: Uint8Array, cache: PeerMap<Peer>): Peer {
  // /peers/${peer-id-as-libp2p-key-cid-string-in-base-32}
  const base32Str = key.toString().split('/')[2]
  const buf = base32.decode(base32Str)
  const peerId = peerIdFromBytes(buf)

  const cached = cache.get(peerId)

  if (cached != null) {
    return cached
  }

  const peer = bytesToPeer(peerId, value)

  cache.set(peerId, peer)

  return peer
}

function mapQuery (query: PeerQuery, cache: PeerMap<Peer>): Query {
  if (query == null) {
    return {}
  }

  return {
    prefix: NAMESPACE_COMMON,
    filters: (query.filters ?? []).map(fn => ({ key, value }) => {
      return fn(decodePeer(key, value, cache))
    }),
    orders: (query.orders ?? []).map(fn => (a, b) => {
      return fn(decodePeer(a.key, a.value, cache), decodePeer(b.key, b.value, cache))
    })
  }
}

export class PersistentStore {
  private readonly peerId: PeerId
  private readonly datastore: Datastore
  public readonly lock: Mortice
  private readonly addressFilter?: AddressFilter

  constructor (components: PersistentPeerStoreComponents, init: PersistentPeerStoreInit = {}) {
    this.peerId = components.peerId
    this.datastore = components.datastore
    this.addressFilter = init.addressFilter
    this.lock = mortice({
      name: 'peer-store',
      singleProcess: true
    })
  }

  async has (peerId: PeerId): Promise<boolean> {
    return this.datastore.has(peerIdToDatastoreKey(peerId))
  }

  async delete (peerId: PeerId): Promise<void> {
    if (this.peerId.equals(peerId)) {
      throw new CodeError('Cannot delete self peer', codes.ERR_INVALID_PARAMETERS)
    }

    await this.datastore.delete(peerIdToDatastoreKey(peerId))
  }

  async load (peerId: PeerId): Promise<Peer> {
    const buf = await this.datastore.get(peerIdToDatastoreKey(peerId))

    return bytesToPeer(peerId, buf)
  }

  async save (peerId: PeerId, data: PeerData): Promise<PeerUpdate> {
    const {
      existingBuf,
      existingPeer
    } = await this.#findExistingPeer(peerId)

    const peerPb: PeerPB = await toPeerPB(peerId, data, 'patch', {
      addressFilter: this.addressFilter
    })

    return this.#saveIfDifferent(peerId, peerPb, existingBuf, existingPeer)
  }

  async patch (peerId: PeerId, data: Partial<PeerData>): Promise<PeerUpdate> {
    const {
      existingBuf,
      existingPeer
    } = await this.#findExistingPeer(peerId)

    const peerPb: PeerPB = await toPeerPB(peerId, data, 'patch', {
      addressFilter: this.addressFilter,
      existingPeer
    })

    return this.#saveIfDifferent(peerId, peerPb, existingBuf, existingPeer)
  }

  async merge (peerId: PeerId, data: PeerData): Promise<PeerUpdate> {
    const {
      existingBuf,
      existingPeer
    } = await this.#findExistingPeer(peerId)

    const peerPb: PeerPB = await toPeerPB(peerId, data, 'merge', {
      addressFilter: this.addressFilter,
      existingPeer
    })

    return this.#saveIfDifferent(peerId, peerPb, existingBuf, existingPeer)
  }

  async * all (query?: PeerQuery): AsyncGenerator<Peer, void, unknown> {
    const peerCache = new PeerMap<Peer>()

    for await (const { key, value } of this.datastore.query(mapQuery(query ?? {}, peerCache))) {
      const peer = decodePeer(key, value, peerCache)

      if (peer.id.equals(this.peerId)) {
        // Skip self peer if present
        continue
      }

      yield peer
    }
  }

  async #findExistingPeer (peerId: PeerId): Promise<{ existingBuf?: Uint8Array, existingPeer?: Peer }> {
    try {
      const existingBuf = await this.datastore.get(peerIdToDatastoreKey(peerId))
      const existingPeer = bytesToPeer(peerId, existingBuf)

      return {
        existingBuf,
        existingPeer
      }
    } catch (err: any) {
      if (err.code !== 'ERR_NOT_FOUND') {
        throw err
      }
    }

    return {}
  }

  async #saveIfDifferent (peerId: PeerId, peer: PeerPB, existingBuf?: Uint8Array, existingPeer?: Peer): Promise<PeerUpdate> {
    const buf = PeerPB.encode(peer)

    if (existingBuf != null && uint8ArrayEquals(buf, existingBuf)) {
      return {
        peer: bytesToPeer(peerId, buf),
        previous: existingPeer,
        updated: false
      }
    }

    await this.datastore.put(peerIdToDatastoreKey(peerId), buf)

    return {
      peer: bytesToPeer(peerId, buf),
      previous: existingPeer,
      updated: true
    }
  }
}
