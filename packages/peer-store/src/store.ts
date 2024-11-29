import { InvalidParametersError } from '@libp2p/interface'
import { peerIdFromCID } from '@libp2p/peer-id'
import mortice, { type Mortice } from 'mortice'
import { base32 } from 'multiformats/bases/base32'
import { CID } from 'multiformats/cid'
import { equals as uint8ArrayEquals } from 'uint8arrays/equals'
import { Peer as PeerPB } from './pb/peer.js'
import { bytesToPeer } from './utils/bytes-to-peer.js'
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

function decodePeer (key: Key, value: Uint8Array): Peer {
  // /peers/${peer-id-as-libp2p-key-cid-string-in-base-32}
  const base32Str = key.toString().split('/')[2]
  const buf = CID.parse(base32Str, base32)
  const peerId = peerIdFromCID(buf)

  return bytesToPeer(peerId, value)
}

function mapQuery (query: PeerQuery): Query {
  if (query == null) {
    return {}
  }

  return {
    prefix: NAMESPACE_COMMON,
    filters: (query.filters ?? []).map(fn => ({ key, value }) => {
      return fn(decodePeer(key, value))
    }),
    orders: (query.orders ?? []).map(fn => (a, b) => {
      return fn(decodePeer(a.key, a.value), decodePeer(b.key, b.value))
    })
  }
}

export class PersistentStore {
  private readonly peerId: PeerId
  private readonly datastore: Datastore
  public readonly lock: Mortice
  private readonly addressFilter?: AddressFilter
  private readonly log: Logger

  constructor (components: PersistentPeerStoreComponents, init: PersistentPeerStoreInit = {}) {
    this.log = components.logger.forComponent('libp2p:peer-store')
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
      throw new InvalidParametersError('Cannot delete self peer')
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
    for await (const { key, value } of this.datastore.query(mapQuery(query ?? {}))) {
      const peer = decodePeer(key, value)

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
      if (err.name !== 'NotFoundError') {
        this.log.error('invalid peer data found in peer store - %e', err)
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
