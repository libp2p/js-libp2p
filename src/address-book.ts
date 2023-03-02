import { logger } from '@libp2p/logger'
import { CodeError } from '@libp2p/interfaces/errors'
import { isMultiaddr } from '@multiformats/multiaddr'
import { codes } from './errors.js'
import { PeerRecord, RecordEnvelope } from '@libp2p/peer-record'
import { peerIdFromPeerId } from '@libp2p/peer-id'
import { CustomEvent } from '@libp2p/interfaces/events'
import type { Address, AddressFilter, Peer, PeerMultiaddrsChangeData, PeerStore } from '@libp2p/interface-peer-store'
import type { Store } from './store.js'
import type { Envelope } from '@libp2p/interface-record'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { PeerInfo } from '@libp2p/interface-peer-info'
import type { Multiaddr } from '@multiformats/multiaddr'

const log = logger('libp2p:peer-store:address-book')
const EVENT_NAME = 'change:multiaddrs'

async function allowAll (): Promise<boolean> {
  return true
}

export class PeerStoreAddressBook {
  private readonly dispatchEvent: PeerStore['dispatchEvent']
  private readonly store: Store
  private readonly addressFilter: AddressFilter

  constructor (dispatchEvent: PeerStore['dispatchEvent'], store: Store, addressFilter?: AddressFilter) {
    this.dispatchEvent = dispatchEvent
    this.store = store
    this.addressFilter = addressFilter ?? allowAll
  }

  /**
   * ConsumePeerRecord adds addresses from a signed peer record contained in a record envelope.
   * This will return a boolean that indicates if the record was successfully processed and added
   * into the AddressBook.
   */
  async consumePeerRecord (envelope: Envelope): Promise<boolean> {
    log.trace('consumePeerRecord await write lock')
    const release = await this.store.lock.writeLock()
    log.trace('consumePeerRecord got write lock')

    let peerId
    let peer: Peer | undefined
    let updatedPeer

    try {
      let peerRecord
      try {
        peerRecord = PeerRecord.createFromProtobuf(envelope.payload)
      } catch (err: any) {
        log.error('invalid peer record received')
        return false
      }

      peerId = peerRecord.peerId
      const multiaddrs = peerRecord.multiaddrs

      // Verify peerId
      if (!peerId.equals(envelope.peerId)) {
        log('signing key does not match PeerId in the PeerRecord')
        return false
      }

      // ensure the record has multiaddrs
      if (multiaddrs == null || multiaddrs.length === 0) {
        return false
      }

      if (await this.store.has(peerId)) {
        peer = await this.store.load(peerId)

        if (peer.peerRecordEnvelope != null) {
          const storedEnvelope = await RecordEnvelope.createFromProtobuf(peer.peerRecordEnvelope)
          const storedRecord = PeerRecord.createFromProtobuf(storedEnvelope.payload)

          // ensure seq is greater than, or equal to, the last received
          if (storedRecord.seqNumber >= peerRecord.seqNumber) {
            log('sequence number was lower or equal to existing sequence number - stored: %d received: %d', storedRecord.seqNumber, peerRecord.seqNumber)
            return false
          }
        }
      }

      const addresses = await filterMultiaddrs(peerId, multiaddrs, this.addressFilter, true)

      // Replace unsigned addresses by the new ones from the record
      // TODO: Once we have ttls for the addresses, we should merge these in
      updatedPeer = await this.store.patchOrCreate(peerId, {
        addresses,
        peerRecordEnvelope: envelope.marshal().subarray()
      })

      log('stored provided peer record for %p', peerRecord.peerId)
    } finally {
      log.trace('consumePeerRecord release write lock')
      release()
    }

    this.dispatchEvent(new CustomEvent<PeerMultiaddrsChangeData>(EVENT_NAME, {
      detail: {
        peerId,
        multiaddrs: updatedPeer.addresses.map(({ multiaddr }) => multiaddr),
        oldMultiaddrs: peer == null ? [] : peer.addresses.map(({ multiaddr }) => multiaddr)
      }
    }))

    return true
  }

  async getRawEnvelope (peerId: PeerId): Promise<Uint8Array | undefined> {
    log.trace('getRawEnvelope await read lock')
    const release = await this.store.lock.readLock()
    log.trace('getRawEnvelope got read lock')

    try {
      const peer = await this.store.load(peerId)

      return peer.peerRecordEnvelope
    } catch (err: any) {
      if (err.code !== codes.ERR_NOT_FOUND) {
        throw err
      }
    } finally {
      log.trace('getRawEnvelope release read lock')
      release()
    }
  }

  /**
   * Get an Envelope containing a PeerRecord for the given peer.
   * Returns undefined if no record exists.
   */
  async getPeerRecord (peerId: PeerId): Promise<RecordEnvelope | undefined> {
    const raw = await this.getRawEnvelope(peerId)

    if (raw == null) {
      return undefined
    }

    return await RecordEnvelope.createFromProtobuf(raw)
  }

  async get (peerId: PeerId): Promise<Address[]> {
    peerId = peerIdFromPeerId(peerId)

    log.trace('get wait for read lock')
    const release = await this.store.lock.readLock()
    log.trace('get got read lock')

    try {
      const peer = await this.store.load(peerId)

      return peer.addresses
    } catch (err: any) {
      if (err.code !== codes.ERR_NOT_FOUND) {
        throw err
      }
    } finally {
      log.trace('get release read lock')
      release()
    }

    return []
  }

  async set (peerId: PeerId, multiaddrs: Multiaddr[]): Promise<void> {
    peerId = peerIdFromPeerId(peerId)

    if (!Array.isArray(multiaddrs)) {
      log.error('multiaddrs must be an array of Multiaddrs')
      throw new CodeError('multiaddrs must be an array of Multiaddrs', codes.ERR_INVALID_PARAMETERS)
    }

    log.trace('set await write lock')
    const release = await this.store.lock.writeLock()
    log.trace('set got write lock')

    let hasPeer = false
    let peer: Peer | undefined
    let updatedPeer

    try {
      const addresses = await filterMultiaddrs(peerId, multiaddrs, this.addressFilter)

      // No valid addresses found
      if (addresses.length === 0) {
        return
      }

      try {
        peer = await this.store.load(peerId)
        hasPeer = true

        if (new Set([
          ...addresses.map(({ multiaddr }) => multiaddr.toString()),
          ...peer.addresses.map(({ multiaddr }) => multiaddr.toString())
        ]).size === peer.addresses.length && addresses.length === peer.addresses.length) {
          // not changing anything, no need to update
          return
        }
      } catch (err: any) {
        if (err.code !== codes.ERR_NOT_FOUND) {
          throw err
        }
      }

      updatedPeer = await this.store.patchOrCreate(peerId, { addresses })

      log('set multiaddrs for %p', peerId)
    } finally {
      log.trace('set multiaddrs for %p', peerId)
      log('set release write lock')
      release()
    }

    this.dispatchEvent(new CustomEvent<PeerMultiaddrsChangeData>(EVENT_NAME, {
      detail: {
        peerId,
        multiaddrs: updatedPeer.addresses.map(addr => addr.multiaddr),
        oldMultiaddrs: peer == null ? [] : peer.addresses.map(({ multiaddr }) => multiaddr)
      }
    }))

    // Notify the existence of a new peer
    if (!hasPeer) {
      this.dispatchEvent(new CustomEvent<PeerInfo>('peer', {
        detail: {
          id: peerId,
          multiaddrs: updatedPeer.addresses.map(addr => addr.multiaddr),
          protocols: updatedPeer.protocols
        }
      }))
    }
  }

  async add (peerId: PeerId, multiaddrs: Multiaddr[]): Promise<void> {
    peerId = peerIdFromPeerId(peerId)

    if (!Array.isArray(multiaddrs)) {
      log.error('multiaddrs must be an array of Multiaddrs')
      throw new CodeError('multiaddrs must be an array of Multiaddrs', codes.ERR_INVALID_PARAMETERS)
    }

    log.trace('add await write lock')
    const release = await this.store.lock.writeLock()
    log.trace('add got write lock')

    let hasPeer
    let peer: Peer | undefined
    let updatedPeer

    try {
      const addresses = await filterMultiaddrs(peerId, multiaddrs, this.addressFilter)

      // No valid addresses found
      if (addresses.length === 0) {
        return
      }

      try {
        peer = await this.store.load(peerId)
        hasPeer = true

        if (new Set([
          ...addresses.map(({ multiaddr }) => multiaddr.toString()),
          ...peer.addresses.map(({ multiaddr }) => multiaddr.toString())
        ]).size === peer.addresses.length) {
          return
        }
      } catch (err: any) {
        if (err.code !== codes.ERR_NOT_FOUND) {
          throw err
        }
      }

      updatedPeer = await this.store.mergeOrCreate(peerId, { addresses })

      log('added multiaddrs for %p', peerId)
    } finally {
      log.trace('set release write lock')
      release()
    }

    this.dispatchEvent(new CustomEvent<PeerMultiaddrsChangeData>(EVENT_NAME, {
      detail: {
        peerId,
        multiaddrs: updatedPeer.addresses.map(addr => addr.multiaddr),
        oldMultiaddrs: peer == null ? [] : peer.addresses.map(({ multiaddr }) => multiaddr)
      }
    }))

    // Notify the existence of a new peer
    if (hasPeer === true) {
      this.dispatchEvent(new CustomEvent<PeerInfo>('peer', {
        detail: {
          id: peerId,
          multiaddrs: updatedPeer.addresses.map(addr => addr.multiaddr),
          protocols: updatedPeer.protocols
        }
      }))
    }
  }

  async delete (peerId: PeerId): Promise<void> {
    peerId = peerIdFromPeerId(peerId)

    log.trace('delete await write lock')
    const release = await this.store.lock.writeLock()
    log.trace('delete got write lock')

    let peer: Peer | undefined

    try {
      try {
        peer = await this.store.load(peerId)
      } catch (err: any) {
        if (err.code !== codes.ERR_NOT_FOUND) {
          throw err
        }
      }

      await this.store.patchOrCreate(peerId, {
        addresses: []
      })
    } finally {
      log.trace('delete release write lock')
      release()
    }

    if (peer != null) {
      this.dispatchEvent(new CustomEvent<PeerMultiaddrsChangeData>(EVENT_NAME, {
        detail: {
          peerId,
          multiaddrs: [],
          oldMultiaddrs: peer == null ? [] : peer.addresses.map(({ multiaddr }) => multiaddr)
        }
      }))
    }
  }
}

async function filterMultiaddrs (peerId: PeerId, multiaddrs: Multiaddr[], addressFilter: AddressFilter, isCertified: boolean = false): Promise<Address[]> {
  const output: Address[] = []

  await Promise.all(
    multiaddrs.map(async multiaddr => {
      if (!isMultiaddr(multiaddr)) {
        log.error('multiaddr must be an instance of Multiaddr')
        throw new CodeError('multiaddr must be an instance of Multiaddr', codes.ERR_INVALID_PARAMETERS)
      }

      const include = await addressFilter(peerId, multiaddr)

      if (!include) {
        return
      }

      output.push({
        multiaddr,
        isCertified
      })
    })
  )

  return output
}
