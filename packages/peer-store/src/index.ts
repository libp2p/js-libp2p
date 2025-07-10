/**
 * @packageDocumentation
 *
 * The peer store is where libp2p stores data about the peers it has encountered on the network.
 */

import { isPeerId } from '@libp2p/interface'
import { peerIdFromCID } from '@libp2p/peer-id'
import { RecordEnvelope, PeerRecord } from '@libp2p/peer-record'
import all from 'it-all'
import { PersistentStore } from './store.js'
import type { PeerUpdate } from './store.js'
import type { ComponentLogger, Libp2pEvents, Logger, PeerId, PeerStore, Peer, PeerData, PeerQuery, PeerInfo, AbortOptions, ConsumePeerRecordOptions, Metrics } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { Datastore } from 'interface-datastore'
import type { TypedEventTarget } from 'main-event'

export interface PersistentPeerStoreComponents {
  peerId: PeerId
  datastore: Datastore
  events: TypedEventTarget<Libp2pEvents>
  logger: ComponentLogger
  metrics?: Metrics
}

/**
 * Return true to allow storing the passed multiaddr for the passed peer
 */
export interface AddressFilter {
  (peerId: PeerId, multiaddr: Multiaddr, options?: AbortOptions): Promise<boolean> | boolean
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
    for await (const peer of this.store.all(query)) {
      fn(peer)
    }
  }

  async all (query?: PeerQuery): Promise<Peer[]> {
    return all(this.store.all(query))
  }

  async delete (peerId: PeerId, options?: AbortOptions): Promise<void> {
    const release = await this.store.getReadLock(peerId, options)

    try {
      await this.store.delete(peerId, options)
    } finally {
      release()
    }
  }

  async has (peerId: PeerId, options?: AbortOptions): Promise<boolean> {
    const release = await this.store.getReadLock(peerId, options)

    try {
      return await this.store.has(peerId, options)
    } finally {
      this.log.trace('has release read lock')
      release?.()
    }
  }

  async get (peerId: PeerId, options?: AbortOptions): Promise<Peer> {
    const release = await this.store.getReadLock(peerId, options)

    try {
      return await this.store.load(peerId, options)
    } finally {
      release?.()
    }
  }

  async getInfo (peerId: PeerId, options?: AbortOptions): Promise<PeerInfo> {
    const peer = await this.get(peerId, options)

    return {
      id: peer.id,
      multiaddrs: peer.addresses.map(({ multiaddr }) => multiaddr)
    }
  }

  async save (id: PeerId, data: PeerData, options?: AbortOptions): Promise<Peer> {
    const release = await this.store.getWriteLock(id, options)

    try {
      const result = await this.store.save(id, data, options)

      this.#emitIfUpdated(id, result)

      return result.peer
    } finally {
      release?.()
    }
  }

  async patch (id: PeerId, data: PeerData, options?: AbortOptions): Promise<Peer> {
    const release = await this.store.getWriteLock(id, options)

    try {
      const result = await this.store.patch(id, data, options)

      this.#emitIfUpdated(id, result)

      return result.peer
    } finally {
      release?.()
    }
  }

  async merge (id: PeerId, data: PeerData, options?: AbortOptions): Promise<Peer> {
    const release = await this.store.getWriteLock(id, options)

    try {
      const result = await this.store.merge(id, data, options)

      this.#emitIfUpdated(id, result)

      return result.peer
    } finally {
      release?.()
    }
  }

  async consumePeerRecord (buf: Uint8Array, options?: ConsumePeerRecordOptions): Promise<boolean>
  async consumePeerRecord (buf: Uint8Array, expectedPeer?: PeerId, options?: AbortOptions): Promise<boolean>
  async consumePeerRecord (buf: Uint8Array, arg1?: any, arg2?: any): Promise<boolean> {
    const expectedPeer: PeerId | undefined = isPeerId(arg1) ? arg1 : isPeerId(arg1?.expectedPeer) ? arg1.expectedPeer : undefined
    const options: AbortOptions | undefined = isPeerId(arg1) ? arg2 : arg1 === undefined ? arg2 : arg1

    const envelope = await RecordEnvelope.openAndCertify(buf, PeerRecord.DOMAIN, options)
    const peerId = peerIdFromCID(envelope.publicKey.toCID())

    if (expectedPeer?.equals(peerId) === false) {
      this.log('envelope peer id was not the expected peer id - expected: %p received: %p', expectedPeer, peerId)
      return false
    }

    const peerRecord = PeerRecord.createFromProtobuf(envelope.payload)
    let peer: Peer | undefined

    try {
      peer = await this.get(peerId, options)
    } catch (err: any) {
      if (err.name !== 'NotFoundError') {
        throw err
      }
    }

    // ensure seq is greater than, or equal to, the last received
    if (peer?.peerRecordEnvelope != null) {
      const storedEnvelope = RecordEnvelope.createFromProtobuf(peer.peerRecordEnvelope)
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
    }, options)

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
