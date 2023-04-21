import { logger } from '@libp2p/logger'
import type { PeerStore } from '@libp2p/interface-peer-store'
import type { ConnectionManager } from '@libp2p/interface-connection-manager'
import { PeerMap } from '@libp2p/peer-collections'
import PQueue from 'p-queue'
import { AUTO_DIAL_CONCURRENCY, AUTO_DIAL_INTERVAL, AUTO_DIAL_PRIORITY, MIN_CONNECTIONS } from './constants.js'
import type { Startable } from '@libp2p/interfaces/startable'

const log = logger('libp2p:connection-manager:auto-dial')

interface AutoDialInit {
  minConnections?: number
  autoDialConcurrency?: number
  autoDialPriority?: number
  autoDialInterval?: number
}

interface AutoDialComponents {
  connectionManager: ConnectionManager
  peerStore: PeerStore
}

const defaultOptions = {
  minConnections: MIN_CONNECTIONS,
  autoDialConcurrency: AUTO_DIAL_CONCURRENCY,
  autoDialPriority: AUTO_DIAL_PRIORITY,
  autoDialInterval: AUTO_DIAL_INTERVAL
}

export class AutoDial implements Startable {
  private readonly connectionManager: ConnectionManager
  private readonly peerStore: PeerStore
  private readonly queue: PQueue
  private readonly minConnections: number
  private readonly autoDialPriority: number
  private readonly autoDialIntervalMs: number
  private autoDialInterval?: ReturnType<typeof setInterval>
  private started: boolean

  /**
   * Proactively tries to connect to known peers stored in the PeerStore.
   * It will keep the number of connections below the upper limit and sort
   * the peers to connect based on whether we know their keys and protocols.
   */
  constructor (components: AutoDialComponents, init: AutoDialInit) {
    this.connectionManager = components.connectionManager
    this.peerStore = components.peerStore
    this.minConnections = init.minConnections ?? defaultOptions.minConnections
    this.autoDialPriority = init.autoDialPriority ?? defaultOptions.autoDialPriority
    this.autoDialIntervalMs = init.autoDialInterval ?? defaultOptions.autoDialInterval
    this.started = false
    this.queue = new PQueue({
      concurrency: init.autoDialConcurrency ?? defaultOptions.autoDialConcurrency
    })
    this.queue.addListener('error', (err) => {
      log.error('error during auto-dial', err)
    })
  }

  isStarted (): boolean {
    return this.started
  }

  start (): void {
    this.autoDialInterval = setInterval(() => {
      this.autoDial()
        .catch(err => {
          log.error('error while autodialing', err)
        })
    }, this.autoDialIntervalMs)
    this.started = true
  }

  afterStart (): void {
    this.autoDial()
      .catch(err => {
        log.error('error while autodialing', err)
      })
  }

  stop (): void {
    // clear the queue
    this.queue.clear()
    clearInterval(this.autoDialInterval)
    this.started = false
  }

  async autoDial (): Promise<void> {
    const numConnections = this.connectionManager.getConnections().length

    // Already has enough connections
    if (numConnections >= this.minConnections) {
      log('have enough connections %d/%d', numConnections, this.minConnections)
      return
    }

    log('not enough connections %d/%d - will dial peers to increase the number of connections', numConnections, this.minConnections)

    // Sort peers on whether we know protocols or public keys for them
    const peers = await this.peerStore.all()

    // Remove some peers
    const filteredPeers = peers.filter((peer) => {
      // Remove peers without addresses
      if (peer.addresses.length === 0) {
        return false
      }

      return true
    })

    // shuffle the peers - this is so peers with the same tag values will be
    // dialled in a different order each time
    const shuffledPeers = filteredPeers.sort(() => Math.random() > 0.5 ? 1 : -1)

    // Sort shuffled peers by tag value
    const peerValues = new PeerMap<number>()
    for (const peer of shuffledPeers) {
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
    const sortedPeers = shuffledPeers.sort((a, b) => {
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

    log('selected %d/%d peers to dial', sortedPeers.length, peers.length)

    for (const peer of sortedPeers) {
      this.queue.add(async () => {
        const numConnections = this.connectionManager.getConnections().length

        // Check to see if we still need to auto dial
        if (numConnections >= this.minConnections) {
          log('got enough connections now %d/%d', numConnections, this.minConnections)
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
}
