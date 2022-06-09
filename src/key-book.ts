import { logger } from '@libp2p/logger'
import errcode from 'err-code'
import { codes } from './errors.js'
import { peerIdFromPeerId } from '@libp2p/peer-id'
import { equals as uint8arrayEquals } from 'uint8arrays/equals'
import { CustomEvent } from '@libp2p/interfaces/events'
import type { Store } from './store.js'
import type { PeerStore, KeyBook, PeerPublicKeyChangeData, Peer } from '@libp2p/interfaces/peer-store'
import type { PeerId } from '@libp2p/interfaces/peer-id'

const log = logger('libp2p:peer-store:key-book')

const EVENT_NAME = 'change:pubkey'

export class PeerStoreKeyBook implements KeyBook {
  private readonly dispatchEvent: PeerStore['dispatchEvent']
  private readonly store: Store

  /**
   * The KeyBook is responsible for keeping the known public keys of a peer
   */
  constructor (dispatchEvent: PeerStore['dispatchEvent'], store: Store) {
    this.dispatchEvent = dispatchEvent
    this.store = store
  }

  /**
   * Set the Peer public key
   */
  async set (peerId: PeerId, publicKey: Uint8Array) {
    peerId = peerIdFromPeerId(peerId)

    if (!(publicKey instanceof Uint8Array)) {
      log.error('publicKey must be an instance of Uint8Array to store data')
      throw errcode(new Error('publicKey must be an instance of PublicKey'), codes.ERR_INVALID_PARAMETERS)
    }

    log.trace('set await write lock')
    const release = await this.store.lock.writeLock()
    log.trace('set got write lock')

    let updatedKey = false
    let peer: Peer | undefined

    try {
      try {
        peer = await this.store.load(peerId)

        if ((peer.pubKey != null) && uint8arrayEquals(peer.pubKey, publicKey)) {
          return
        }
      } catch (err: any) {
        if (err.code !== codes.ERR_NOT_FOUND) {
          throw err
        }
      }

      await this.store.patchOrCreate(peerId, {
        pubKey: publicKey
      })
      updatedKey = true
    } finally {
      log.trace('set release write lock')
      release()
    }

    if (updatedKey) {
      this.dispatchEvent(new CustomEvent<PeerPublicKeyChangeData>(EVENT_NAME, {
        detail: {
          peerId,
          publicKey: publicKey,
          oldPublicKey: peer == null ? undefined : peer.pubKey
        }
      }))
    }
  }

  /**
   * Get Public key of the given PeerId, if stored
   */
  async get (peerId: PeerId) {
    peerId = peerIdFromPeerId(peerId)

    log.trace('get await write lock')
    const release = await this.store.lock.readLock()
    log.trace('get got write lock')

    try {
      const peer = await this.store.load(peerId)

      return peer.pubKey
    } catch (err: any) {
      if (err.code !== codes.ERR_NOT_FOUND) {
        throw err
      }
    } finally {
      log('get release write lock')
      release()
    }
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

      await this.store.patchOrCreate(peerId, {
        pubKey: undefined
      })
    } catch (err: any) {
      if (err.code !== codes.ERR_NOT_FOUND) {
        throw err
      }
    } finally {
      log.trace('delete release write lock')
      release()
    }

    this.dispatchEvent(new CustomEvent<PeerPublicKeyChangeData>(EVENT_NAME, {
      detail: {
        peerId,
        publicKey: undefined,
        oldPublicKey: peer == null ? undefined : peer.pubKey
      }
    }))
  }
}
