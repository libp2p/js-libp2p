import { logger } from '@libp2p/logger'
import { peerIdFromBytes } from '@libp2p/peer-id'
import errcode from 'err-code'
import { codes } from './errors.js'
import { Key } from 'interface-datastore/key'
import { base32 } from 'multiformats/bases/base32'
import { multiaddr } from '@multiformats/multiaddr'
import { Metadata, Peer as PeerPB } from './pb/peer.js'
import mortice from 'mortice'
import { equals as uint8arrayEquals } from 'uint8arrays/equals'
import type { Peer } from '@libp2p/interface-peer-store'
import type { PeerId } from '@libp2p/interface-peer-id'
import { Components } from '@libp2p/components'

const log = logger('libp2p:peer-store:store')

const NAMESPACE_COMMON = '/peers/'

export interface Store {
  has: (peerId: PeerId) => Promise<boolean>
  save: (peer: Peer) => Promise<Peer>
  load: (peerId: PeerId) => Promise<Peer>
  delete: (peerId: PeerId) => Promise<void>
  merge: (peerId: PeerId, data: Partial<Peer>) => Promise<Peer>
  mergeOrCreate: (peerId: PeerId, data: Partial<Peer>) => Promise<Peer>
  patch: (peerId: PeerId, data: Partial<Peer>) => Promise<Peer>
  patchOrCreate: (peerId: PeerId, data: Partial<Peer>) => Promise<Peer>
  all: () => AsyncIterable<Peer>

  lock: {
    readLock: () => Promise<() => void>
    writeLock: () => Promise<() => void>
  }
}

export class PersistentStore {
  private components: Components = new Components()
  public lock: any

  constructor () {
    this.lock = mortice({
      name: 'peer-store',
      singleProcess: true
    })
  }

  init (components: Components) {
    this.components = components
  }

  _peerIdToDatastoreKey (peerId: PeerId) {
    if (peerId.type == null) {
      log.error('peerId must be an instance of peer-id to store data')
      throw errcode(new Error('peerId must be an instance of peer-id'), codes.ERR_INVALID_PARAMETERS)
    }

    const b32key = peerId.toCID().toString()
    return new Key(`${NAMESPACE_COMMON}${b32key}`)
  }

  async has (peerId: PeerId) {
    return await this.components.getDatastore().has(this._peerIdToDatastoreKey(peerId))
  }

  async delete (peerId: PeerId) {
    await this.components.getDatastore().delete(this._peerIdToDatastoreKey(peerId))
  }

  async load (peerId: PeerId): Promise<Peer> {
    const buf = await this.components.getDatastore().get(this._peerIdToDatastoreKey(peerId))
    const peer = PeerPB.decode(buf)
    const metadata = new Map()

    for (const meta of peer.metadata) {
      metadata.set(meta.key, meta.value)
    }

    return {
      ...peer,
      id: peerId,
      addresses: peer.addresses.map(({ multiaddr: ma, isCertified }) => {
        return {
          multiaddr: multiaddr(ma),
          isCertified: isCertified ?? false
        }
      }),
      metadata,
      pubKey: peer.pubKey ?? undefined,
      peerRecordEnvelope: peer.peerRecordEnvelope ?? undefined
    }
  }

  async save (peer: Peer) {
    if (peer.pubKey != null && peer.id.publicKey != null && !uint8arrayEquals(peer.pubKey, peer.id.publicKey)) {
      log.error('peer publicKey bytes do not match peer id publicKey bytes')
      throw errcode(new Error('publicKey bytes do not match peer id publicKey bytes'), codes.ERR_INVALID_PARAMETERS)
    }

    // dedupe addresses
    const addressSet = new Set()
    const addresses = peer.addresses
      .filter(address => {
        if (addressSet.has(address.multiaddr.toString())) {
          return false
        }

        addressSet.add(address.multiaddr.toString())
        return true
      })
      .sort((a, b) => {
        return a.multiaddr.toString().localeCompare(b.multiaddr.toString())
      })
      .map(({ multiaddr, isCertified }) => ({
        multiaddr: multiaddr.bytes,
        isCertified
      }))

    const metadata: Metadata[] = []

    ;[...peer.metadata.keys()].sort().forEach(key => {
      const value = peer.metadata.get(key)

      if (value != null) {
        metadata.push({ key, value })
      }
    })

    const buf = PeerPB.encode({
      addresses,
      protocols: peer.protocols.sort(),
      pubKey: peer.pubKey,
      metadata,
      peerRecordEnvelope: peer.peerRecordEnvelope
    })

    await this.components.getDatastore().put(this._peerIdToDatastoreKey(peer.id), buf.subarray())

    return await this.load(peer.id)
  }

  async patch (peerId: PeerId, data: Partial<Peer>) {
    const peer = await this.load(peerId)

    return await this._patch(peerId, data, peer)
  }

  async patchOrCreate (peerId: PeerId, data: Partial<Peer>) {
    let peer: Peer

    try {
      peer = await this.load(peerId)
    } catch (err: any) {
      if (err.code !== codes.ERR_NOT_FOUND) {
        throw err
      }

      peer = { id: peerId, addresses: [], protocols: [], metadata: new Map() }
    }

    return await this._patch(peerId, data, peer)
  }

  async _patch (peerId: PeerId, data: Partial<Peer>, peer: Peer) {
    return await this.save({
      ...peer,
      ...data,
      id: peerId
    })
  }

  async merge (peerId: PeerId, data: Partial<Peer>) {
    const peer = await this.load(peerId)

    return await this._merge(peerId, data, peer)
  }

  async mergeOrCreate (peerId: PeerId, data: Partial<Peer>) {
    /** @type {Peer} */
    let peer

    try {
      peer = await this.load(peerId)
    } catch (err: any) {
      if (err.code !== codes.ERR_NOT_FOUND) {
        throw err
      }

      peer = { id: peerId, addresses: [], protocols: [], metadata: new Map() }
    }

    return await this._merge(peerId, data, peer)
  }

  async _merge (peerId: PeerId, data: Partial<Peer>, peer: Peer) {
    // if the peer has certified addresses, use those in
    // favour of the supplied versions
    const addresses = new Map<string, boolean>()

    peer.addresses.forEach((addr) => {
      addresses.set(addr.multiaddr.toString(), addr.isCertified)
    })

    ;(data.addresses ?? []).forEach(addr => {
      const addrString = addr.multiaddr.toString()
      const isAlreadyCertified = Boolean(addresses.get(addrString))

      const isCertified = isAlreadyCertified || addr.isCertified

      addresses.set(addrString, isCertified)
    })

    return await this.save({
      id: peerId,
      addresses: Array.from(addresses.entries()).map(([addrStr, isCertified]) => {
        return {
          multiaddr: multiaddr(addrStr),
          isCertified
        }
      }),
      protocols: Array.from(new Set([
        ...(peer.protocols ?? []),
        ...(data.protocols ?? [])
      ])),
      metadata: new Map([
        ...(peer.metadata?.entries() ?? []),
        ...(data.metadata?.entries() ?? [])
      ]),
      pubKey: data.pubKey ?? (peer != null ? peer.pubKey : undefined),
      peerRecordEnvelope: data.peerRecordEnvelope ?? (peer != null ? peer.peerRecordEnvelope : undefined)
    })
  }

  async * all () {
    for await (const key of this.components.getDatastore().queryKeys({
      prefix: NAMESPACE_COMMON
    })) {
      // /peers/${peer-id-as-libp2p-key-cid-string-in-base-32}
      const base32Str = key.toString().split('/')[2]
      const buf = base32.decode(base32Str)

      yield this.load(peerIdFromBytes(buf))
    }
  }
}
