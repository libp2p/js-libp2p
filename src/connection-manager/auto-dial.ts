import { logger } from '@libp2p/logger'
import type { PeerStore } from '@libp2p/interface-peer-store'
import type { ConnectionManager } from '@libp2p/interface-connection-manager'
import { PeerMap } from '@libp2p/peer-collections'
import PQueue from 'p-queue'
import { AUTO_DIAL_CONCURRENCY, AUTO_DIAL_PRIORITY, MIN_CONNECTIONS } from './constants.js'

const log = logger('libp2p:connection-manager:auto-dial')

export interface AutoDialInit {
  /**
   * The minimum number of connections below which libp2p will start to dial
   * peers from the peer book. (default: 0)
   */
  minConnections?: number

  /**
   * When dialling peers from the peer book to keep the number of open connections
   * above `minConnections`, add dials for this many peers to the dial queue
   * at once. (default: 25)
   */
  autoDialConcurrency?: number

  /**
   * To allow user dials to take priority over auto dials, use this value as the
   * dial priority (default: 0)
   */
  autoDialPriority?: number
}

export interface AutoDialComponents {
  connectionManager: ConnectionManager
  peerStore: PeerStore
}

const defaultOptions = {
  minConnections: MIN_CONNECTIONS,
  autoDialConcurrency: AUTO_DIAL_CONCURRENCY,
  autoDialPriority: AUTO_DIAL_PRIORITY
}

export class AutoDial {
  private readonly connectionManager: ConnectionManager
  private readonly peerStore: PeerStore
  private readonly queue: PQueue
  private readonly minConnections: number
  private readonly autoDialPriority: number

  /**
   * Proactively tries to connect to known peers stored in the PeerStore.
   * It will keep the number of connections below the upper limit and sort
   * the peers to connect based on wether we know their keys and protocols.
   */
  constructor (components: AutoDialComponents, init: AutoDialInit) {
    this.connectionManager = components.connectionManager
    this.peerStore = components.peerStore
    this.minConnections = init.minConnections ?? defaultOptions.minConnections
    this.autoDialPriority = init.autoDialPriority ?? defaultOptions.autoDialPriority
    this.queue = new PQueue({
      concurrency: init.autoDialConcurrency ?? defaultOptions.autoDialConcurrency
    })
    this.queue.addListener('error', (err) => {
      log.error('error during auto-dial', err)
    })
  }

  async autoDial (): Promise<void> {
    // Already has enough connections
    if (this.connectionManager.getConnections().length >= this.minConnections) {
      return
    }

    // Sort peers on whether we know protocols or public keys for them
    let peers = await this.peerStore.all()

    // Remove some peers
    peers = peers.filter((peer) => {
      // Remove peers without addresses
      if (peer.addresses.length === 0) {
        return false
      }

      // Remove RSA peers with no public key (since we'd have to look it up on the DHT)
      if (peer.id.publicKey == null) {
        return false
      }

      return true
    })

    // shuffle the peers
    peers = peers.sort(() => Math.random() > 0.5 ? 1 : -1)

    // Sort shuffled peers by tag value
    const peerValues = new PeerMap<number>()
    for (const peer of peers) {
      if (peerValues.has(peer.id)) {
        continue
      }

      const tags = await this.peerStore.getTags(peer.id)

      // sum all tag values
      peerValues.set(peer.id, (tags ?? []).reduce((acc, curr) => {
        return acc + curr.value
      }, 0))
    }

    // sort by value, highest to lowest
    const sortedPeers = peers.sort((a, b) => {
      const peerAValue = peerValues.get(a.id) ?? 0
      const peerBValue = peerValues.get(b.id) ?? 0

      if (peerAValue > peerBValue) {
        return -1
      }

      if (peerAValue < peerBValue) {
        return 1
      }

      return 0
    })

    for (const peer of sortedPeers) {
      this.queue.add(async () => {
        // Check to see if we still need to auto dial
        if (this.connectionManager.getConnections().length > this.minConnections) {
          this.queue.clear()
          return
        }

        log('connecting to a peerStore stored peer %p', peer.id)
        await this.connectionManager.openConnection(peer.id, {
          // @ts-expect-error needs adding to the ConnectionManager interface
          priority: this.autoDialPriority
        })
      }).catch(err => {
        log.error('could not connect to peerStore stored peer', err)
      })
    }
  }

  stop (): void {
    // clear the queue
    this.queue.clear()
  }
}
