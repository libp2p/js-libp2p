import { logger } from '@libp2p/logger'
import { CodeError } from '@libp2p/interfaces/errors'
import { codes } from './errors.js'
import { peerIdFromPeerId } from '@libp2p/peer-id'
import { CustomEvent } from '@libp2p/interfaces/events'
import type { Store } from './store.js'
import type { Peer, PeerProtocolsChangeData, PeerStore, ProtoBook } from '@libp2p/interface-peer-store'
import type { PeerId } from '@libp2p/interface-peer-id'

const log = logger('libp2p:peer-store:proto-book')

const EVENT_NAME = 'change:protocols'

export class PeerStoreProtoBook implements ProtoBook {
  private readonly dispatchEvent: PeerStore['dispatchEvent']
  private readonly store: Store

  /**
   * The ProtoBook is responsible for keeping the known supported
   * protocols of a peer
   */
  constructor (dispatchEvent: PeerStore['dispatchEvent'], store: Store) {
    this.dispatchEvent = dispatchEvent
    this.store = store
  }

  async get (peerId: PeerId): Promise<string[]> {
    log.trace('get wait for read lock')
    const release = await this.store.lock.readLock()
    log.trace('get got read lock')

    try {
      const peer = await this.store.load(peerId)

      return peer.protocols
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

  async set (peerId: PeerId, protocols: string[]): Promise<void> {
    peerId = peerIdFromPeerId(peerId)

    if (!Array.isArray(protocols)) {
      log.error('protocols must be provided to store data')
      throw new CodeError('protocols must be provided', codes.ERR_INVALID_PARAMETERS)
    }

    log.trace('set await write lock')
    const release = await this.store.lock.writeLock()
    log.trace('set got write lock')

    let peer
    let updatedPeer

    try {
      try {
        peer = await this.store.load(peerId)

        if (new Set([
          ...protocols
        ]).size === peer.protocols.length) {
          return
        }
      } catch (err: any) {
        if (err.code !== codes.ERR_NOT_FOUND) {
          throw err
        }
      }

      updatedPeer = await this.store.patchOrCreate(peerId, {
        protocols
      })

      log('stored provided protocols for %p', peerId)
    } finally {
      log.trace('set release write lock')
      release()
    }

    this.dispatchEvent(new CustomEvent<PeerProtocolsChangeData>(EVENT_NAME, {
      detail: {
        peerId,
        protocols: updatedPeer.protocols,
        oldProtocols: peer == null ? [] : peer.protocols
      }
    }))
  }

  async add (peerId: PeerId, protocols: string[]): Promise<void> {
    peerId = peerIdFromPeerId(peerId)

    if (!Array.isArray(protocols)) {
      log.error('protocols must be provided to store data')
      throw new CodeError('protocols must be provided', codes.ERR_INVALID_PARAMETERS)
    }

    log.trace('add await write lock')
    const release = await this.store.lock.writeLock()
    log.trace('add got write lock')

    let peer: Peer | undefined
    let updatedPeer

    try {
      try {
        peer = await this.store.load(peerId)

        if (new Set([
          ...peer.protocols,
          ...protocols
        ]).size === peer.protocols.length) {
          return
        }
      } catch (err: any) {
        if (err.code !== codes.ERR_NOT_FOUND) {
          throw err
        }
      }

      updatedPeer = await this.store.mergeOrCreate(peerId, {
        protocols
      })

      log('added provided protocols for %p', peerId)
    } finally {
      log.trace('add release write lock')
      release()
    }

    this.dispatchEvent(new CustomEvent<PeerProtocolsChangeData>(EVENT_NAME, {
      detail: {
        peerId,
        protocols: updatedPeer.protocols,
        oldProtocols: peer == null ? [] : peer.protocols
      }
    }))
  }

  async remove (peerId: PeerId, protocols: string[]): Promise<void> {
    peerId = peerIdFromPeerId(peerId)

    if (!Array.isArray(protocols)) {
      log.error('protocols must be provided to store data')
      throw new CodeError('protocols must be provided', codes.ERR_INVALID_PARAMETERS)
    }

    log.trace('remove await write lock')
    const release = await this.store.lock.writeLock()
    log.trace('remove got write lock')

    let peer: Peer | undefined
    let updatedPeer: Peer

    try {
      try {
        peer = await this.store.load(peerId)
        const protocolSet = new Set(peer.protocols)

        for (const protocol of protocols) {
          protocolSet.delete(protocol)
        }

        if (peer.protocols.length === protocolSet.size) {
          return
        }

        protocols = Array.from(protocolSet)
      } catch (err: any) {
        if (err.code !== codes.ERR_NOT_FOUND) {
          throw err
        }
      }

      updatedPeer = await this.store.patchOrCreate(peerId, {
        protocols
      })
    } finally {
      log.trace('remove release write lock')
      release()
    }

    this.dispatchEvent(new CustomEvent<PeerProtocolsChangeData>(EVENT_NAME, {
      detail: {
        peerId,
        protocols: updatedPeer.protocols,
        oldProtocols: peer == null ? [] : peer.protocols
      }
    }))
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
        protocols: []
      })
    } finally {
      log.trace('delete release write lock')
      release()
    }

    if (peer != null) {
      this.dispatchEvent(new CustomEvent<PeerProtocolsChangeData>(EVENT_NAME, {
        detail: {
          peerId,
          protocols: [],
          oldProtocols: peer.protocols
        }
      }))
    }
  }
}
