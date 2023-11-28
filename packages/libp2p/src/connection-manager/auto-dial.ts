import { PeerMap, PeerSet } from '@libp2p/peer-collections'
import { PeerJobQueue } from '@libp2p/utils/peer-job-queue'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { AUTO_DIAL_CONCURRENCY, AUTO_DIAL_DISCOVERED_PEERS_DEBOUNCE, AUTO_DIAL_INTERVAL, AUTO_DIAL_MAX_QUEUE_LENGTH, AUTO_DIAL_PEER_RETRY_THRESHOLD, AUTO_DIAL_PRIORITY, LAST_DIAL_FAILURE_KEY, MIN_CONNECTIONS } from './constants.js'
import type { Libp2pEvents, Logger, ComponentLogger, TypedEventTarget, PeerStore, Startable } from '@libp2p/interface'
import type { ConnectionManager } from '@libp2p/interface-internal'

interface AutoDialInit {
  minConnections?: number
  maxQueueLength?: number
  autoDialConcurrency?: number
  autoDialPriority?: number
  autoDialInterval?: number
  autoDialPeerRetryThreshold?: number
  autoDialDiscoveredPeersDebounce?: number
}

interface AutoDialComponents {
  connectionManager: ConnectionManager
  peerStore: PeerStore
  events: TypedEventTarget<Libp2pEvents>
  logger: ComponentLogger
}

const defaultOptions = {
  minConnections: MIN_CONNECTIONS,
  maxQueueLength: AUTO_DIAL_MAX_QUEUE_LENGTH,
  autoDialConcurrency: AUTO_DIAL_CONCURRENCY,
  autoDialPriority: AUTO_DIAL_PRIORITY,
  autoDialInterval: AUTO_DIAL_INTERVAL,
  autoDialPeerRetryThreshold: AUTO_DIAL_PEER_RETRY_THRESHOLD,
  autoDialDiscoveredPeersDebounce: AUTO_DIAL_DISCOVERED_PEERS_DEBOUNCE
}

export class AutoDial implements Startable {
  private readonly connectionManager: ConnectionManager
  private readonly peerStore: PeerStore
  private readonly queue: PeerJobQueue
  private readonly minConnections: number
  private readonly autoDialPriority: number
  private readonly autoDialIntervalMs: number
  private readonly autoDialMaxQueueLength: number
  private readonly autoDialPeerRetryThresholdMs: number
  private readonly autoDialDiscoveredPeersDebounce: number
  private autoDialInterval?: ReturnType<typeof setInterval>
  private started: boolean
  private running: boolean
  private readonly log: Logger

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
    this.autoDialMaxQueueLength = init.maxQueueLength ?? defaultOptions.maxQueueLength
    this.autoDialPeerRetryThresholdMs = init.autoDialPeerRetryThreshold ?? defaultOptions.autoDialPeerRetryThreshold
    this.autoDialDiscoveredPeersDebounce = init.autoDialDiscoveredPeersDebounce ?? defaultOptions.autoDialDiscoveredPeersDebounce
    this.log = components.logger.forComponent('libp2p:connection-manager:auto-dial')
    this.started = false
    this.running = false
    this.queue = new PeerJobQueue({
      concurrency: init.autoDialConcurrency ?? defaultOptions.autoDialConcurrency
    })
    this.queue.addListener('error', (err) => {
      this.log.error('error during auto-dial', err)
    })

    // check the min connection limit whenever a peer disconnects
    components.events.addEventListener('connection:close', () => {
      this.autoDial()
        .catch(err => {
          this.log.error(err)
        })
    })

    // sometimes peers are discovered in quick succession so add a small
    // debounce to ensure all eligible peers are autodialed
    let debounce: ReturnType<typeof setTimeout>

    // when new peers are discovered, dial them if we don't have
    // enough connections
    components.events.addEventListener('peer:discovery', () => {
      clearTimeout(debounce)
      debounce = setTimeout(() => {
        this.autoDial()
          .catch(err => {
            this.log.error(err)
          })
      }, this.autoDialDiscoveredPeersDebounce)
    })
  }

  isStarted (): boolean {
    return this.started
  }

  start (): void {
    this.autoDialInterval = setTimeout(() => {
      this.autoDial()
        .catch(err => {
          this.log.error('error while autodialing', err)
        })
    }, this.autoDialIntervalMs)
    this.started = true
  }

  afterStart (): void {
    this.autoDial()
      .catch(err => {
        this.log.error('error while autodialing', err)
      })
  }

  stop (): void {
    // clear the queue
    this.queue.clear()
    clearTimeout(this.autoDialInterval)
    this.started = false
    this.running = false
  }

  async autoDial (): Promise<void> {
    if (!this.started) {
      return
    }

    const connections = this.connectionManager.getConnectionsMap()
    const numConnections = connections.size

    // Already has enough connections
    if (numConnections >= this.minConnections) {
      if (this.minConnections > 0) {
        this.log.trace('have enough connections %d/%d', numConnections, this.minConnections)
      }
      return
    }

    if (this.queue.size > this.autoDialMaxQueueLength) {
      this.log('not enough connections %d/%d but auto dial queue is full', numConnections, this.minConnections)
      return
    }

    if (this.running) {
      this.log('not enough connections %d/%d - but skipping autodial as it is already running', numConnections, this.minConnections)
      return
    }

    this.running = true

    this.log('not enough connections %d/%d - will dial peers to increase the number of connections', numConnections, this.minConnections)

    const dialQueue = new PeerSet(
      // @ts-expect-error boolean filter removes falsy peer IDs
      this.connectionManager.getDialQueue()
        .map(queue => queue.peerId)
        .filter(Boolean)
    )

    // Sort peers on whether we know protocols or public keys for them
    const peers = await this.peerStore.all({
      filters: [
        // Remove some peers
        (peer) => {
          // Remove peers without addresses
          if (peer.addresses.length === 0) {
            this.log.trace('not autodialing %p because they have no addresses', peer.id)
            return false
          }

          // remove peers we are already connected to
          if (connections.has(peer.id)) {
            this.log.trace('not autodialing %p because they are already connected', peer.id)
            return false
          }

          // remove peers we are already dialling
          if (dialQueue.has(peer.id)) {
            this.log.trace('not autodialing %p because they are already being dialed', peer.id)
            return false
          }

          // remove peers already in the autodial queue
          if (this.queue.hasJob(peer.id)) {
            this.log.trace('not autodialing %p because they are already being autodialed', peer.id)
            return false
          }

          return true
        }
      ]
    })

    // shuffle the peers - this is so peers with the same tag values will be
    // dialled in a different order each time
    const shuffledPeers = peers.sort(() => Math.random() > 0.5 ? 1 : -1)

    // Sort shuffled peers by tag value
    const peerValues = new PeerMap<number>()
    for (const peer of shuffledPeers) {
      if (peerValues.has(peer.id)) {
        continue
      }

      // sum all tag values
      peerValues.set(peer.id, [...peer.tags.values()].reduce((acc, curr) => {
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

    const peersThatHaveNotFailed = sortedPeers.filter(peer => {
      const lastDialFailure = peer.metadata.get(LAST_DIAL_FAILURE_KEY)

      if (lastDialFailure == null) {
        return true
      }

      const lastDialFailureTimestamp = parseInt(uint8ArrayToString(lastDialFailure))

      if (isNaN(lastDialFailureTimestamp)) {
        return true
      }

      // only dial if the time since the last failure is above the retry threshold
      return Date.now() - lastDialFailureTimestamp > this.autoDialPeerRetryThresholdMs
    })

    this.log('selected %d/%d peers to dial', peersThatHaveNotFailed.length, peers.length)

    for (const peer of peersThatHaveNotFailed) {
      this.queue.add(async () => {
        const numConnections = this.connectionManager.getConnectionsMap().size

        // Check to see if we still need to auto dial
        if (numConnections >= this.minConnections) {
          this.log('got enough connections now %d/%d', numConnections, this.minConnections)
          this.queue.clear()
          return
        }

        this.log('connecting to a peerStore stored peer %p', peer.id)
        await this.connectionManager.openConnection(peer.id, {
          priority: this.autoDialPriority
        })
      }, {
        peerId: peer.id
      }).catch(err => {
        this.log.error('could not connect to peerStore stored peer', err)
      })
    }

    this.running = false

    if (this.started) {
      this.autoDialInterval = setTimeout(() => {
        this.autoDial()
          .catch(err => {
            this.log.error('error while autodialing', err)
          })
      }, this.autoDialIntervalMs)
    }
  }
}
