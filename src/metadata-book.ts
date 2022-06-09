import { logger } from '@libp2p/logger'
import errcode from 'err-code'
import { codes } from './errors.js'
import { peerIdFromPeerId } from '@libp2p/peer-id'
import { equals as uint8ArrayEquals } from 'uint8arrays/equals'
import { CustomEvent } from '@libp2p/interfaces/events'
import type { Store } from './store.js'
import type { PeerStore, MetadataBook, PeerMetadataChangeData, Peer } from '@libp2p/interfaces/peer-store'
import type { PeerId } from '@libp2p/interfaces/peer-id'

const log = logger('libp2p:peer-store:metadata-book')

const EVENT_NAME = 'change:metadata'

export class PeerStoreMetadataBook implements MetadataBook {
  private readonly dispatchEvent: PeerStore['dispatchEvent']
  private readonly store: Store

  /**
   * The MetadataBook is responsible for keeping metadata
   * about known peers
   */
  constructor (dispatchEvent: PeerStore['dispatchEvent'], store: Store) {
    this.dispatchEvent = dispatchEvent
    this.store = store
  }

  /**
   * Get the known data of a provided peer
   */
  async get (peerId: PeerId) {
    peerId = peerIdFromPeerId(peerId)

    log.trace('get await read lock')
    const release = await this.store.lock.readLock()
    log.trace('get got read lock')

    try {
      const peer = await this.store.load(peerId)

      return peer.metadata
    } catch (err: any) {
      if (err.code !== codes.ERR_NOT_FOUND) {
        throw err
      }
    } finally {
      log.trace('get release read lock')
      release()
    }

    return new Map()
  }

  /**
   * Get specific metadata value, if it exists
   */
  async getValue (peerId: PeerId, key: string) {
    peerId = peerIdFromPeerId(peerId)

    log.trace('getValue await read lock')
    const release = await this.store.lock.readLock()
    log.trace('getValue got read lock')

    try {
      const peer = await this.store.load(peerId)

      return peer.metadata.get(key)
    } catch (err: any) {
      if (err.code !== codes.ERR_NOT_FOUND) {
        throw err
      }
    } finally {
      log.trace('getValue release write lock')
      release()
    }
  }

  async set (peerId: PeerId, metadata: Map<string, Uint8Array>) {
    peerId = peerIdFromPeerId(peerId)

    if (!(metadata instanceof Map)) {
      log.error('valid metadata must be provided to store data')
      throw errcode(new Error('valid metadata must be provided'), codes.ERR_INVALID_PARAMETERS)
    }

    log.trace('set await write lock')
    const release = await this.store.lock.writeLock()
    log.trace('set got write lock')

    let peer: Peer | undefined

    try {
      try {
        peer = await this.store.load(peerId)
      } catch (err: any) {
        if (err.code !== codes.ERR_NOT_FOUND) {
          throw err
        }
      }

      await this.store.mergeOrCreate(peerId, {
        metadata
      })
    } finally {
      log.trace('set release write lock')
      release()
    }

    this.dispatchEvent(new CustomEvent<PeerMetadataChangeData>(EVENT_NAME, {
      detail: {
        peerId,
        metadata,
        oldMetadata: peer == null ? new Map() : peer.metadata
      }
    }))
  }

  /**
   * Set metadata key and value of a provided peer
   */
  async setValue (peerId: PeerId, key: string, value: Uint8Array) {
    peerId = peerIdFromPeerId(peerId)

    if (typeof key !== 'string' || !(value instanceof Uint8Array)) {
      log.error('valid key and value must be provided to store data')
      throw errcode(new Error('valid key and value must be provided'), codes.ERR_INVALID_PARAMETERS)
    }

    log.trace('setValue await write lock')
    const release = await this.store.lock.writeLock()
    log.trace('setValue got write lock')

    let peer: Peer | undefined
    let updatedPeer

    try {
      try {
        peer = await this.store.load(peerId)
        const existingValue = peer.metadata.get(key)

        if (existingValue != null && uint8ArrayEquals(value, existingValue)) {
          return
        }
      } catch (err: any) {
        if (err.code !== codes.ERR_NOT_FOUND) {
          throw err
        }
      }

      updatedPeer = await this.store.mergeOrCreate(peerId, {
        metadata: new Map([[key, value]])
      })
    } finally {
      log.trace('setValue release write lock')
      release()
    }

    this.dispatchEvent(new CustomEvent<PeerMetadataChangeData>(EVENT_NAME, {
      detail: {
        peerId,
        metadata: updatedPeer.metadata,
        oldMetadata: peer == null ? new Map() : peer.metadata
      }
    }))
  }

  async delete (peerId: PeerId) {
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

      if (peer != null) {
        await this.store.patch(peerId, {
          metadata: new Map()
        })
      }
    } finally {
      log.trace('delete release write lock')
      release()
    }

    if (peer != null) {
      this.dispatchEvent(new CustomEvent<PeerMetadataChangeData>(EVENT_NAME, {
        detail: {
          peerId,
          metadata: new Map(),
          oldMetadata: peer.metadata
        }
      }))
    }
  }

  async deleteValue (peerId: PeerId, key: string) {
    peerId = peerIdFromPeerId(peerId)

    log.trace('deleteValue await write lock')
    const release = await this.store.lock.writeLock()
    log.trace('deleteValue got write lock')

    let metadata
    let peer: Peer | undefined

    try {
      peer = await this.store.load(peerId)
      metadata = peer.metadata

      metadata.delete(key)

      await this.store.patch(peerId, {
        metadata
      })
    } catch (err: any) {
      if (err.code !== codes.ERR_NOT_FOUND) {
        throw err
      }
    } finally {
      log.trace('deleteValue release write lock')
      release()
    }

    if (metadata != null) {
      this.dispatchEvent(new CustomEvent<PeerMetadataChangeData>(EVENT_NAME, {
        detail: {
          peerId,
          metadata,
          oldMetadata: peer == null ? new Map() : peer.metadata
        }
      }))
    }
  }
}
