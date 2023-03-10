// @ts-expect-error no types
import KBuck from 'k-bucket'
import * as utils from '../utils.js'
import Queue from 'p-queue'
import { TimeoutController } from 'timeout-abort-controller'
import { logger } from '@libp2p/logger'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { Startable } from '@libp2p/interfaces/startable'
import type { Logger } from '@libp2p/logger'
import { PeerSet } from '@libp2p/peer-collections'
import type { Metric, Metrics } from '@libp2p/interface-metrics'
import type { PeerStore } from '@libp2p/interface-peer-store'
import type { ConnectionManager } from '@libp2p/interface-connection-manager'

export const KAD_CLOSE_TAG_NAME = 'kad-close'
export const KAD_CLOSE_TAG_VALUE = 50
export const KBUCKET_SIZE = 20
export const PING_TIMEOUT = 10000
export const PING_CONCURRENCY = 10

export interface KBucketPeer {
  id: Uint8Array
  peer: PeerId
}

export interface KBucket {
  id: Uint8Array
  contacts: KBucketPeer[]
  dontSplit: boolean
  left: KBucket
  right: KBucket
}

interface KBucketTreeEvents {
  'ping': (oldContacts: KBucketPeer[], newContact: KBucketPeer) => void
  'added': (contact: KBucketPeer) => void
  'removed': (contact: KBucketPeer) => void
}

export interface KBucketTree {
  root: KBucket
  localNodeId: Uint8Array

  on: <U extends keyof KBucketTreeEvents>(
    event: U, listener: KBucketTreeEvents[U]
  ) => this

  closest: (key: Uint8Array, count: number) => KBucketPeer[]
  closestPeer: (key: Uint8Array) => KBucketPeer
  remove: (key: Uint8Array) => void
  add: (peer: KBucketPeer) => void
  get: (key: Uint8Array) => Uint8Array
  count: () => number
  toIterable: () => Iterable<KBucketPeer>
}

export interface RoutingTableInit {
  lan: boolean
  protocol: string
  kBucketSize?: number
  pingTimeout?: number
  pingConcurrency?: number
  tagName?: string
  tagValue?: number
}

export interface RoutingTableComponents {
  peerId: PeerId
  peerStore: PeerStore
  connectionManager: ConnectionManager
  metrics?: Metrics
}

/**
 * A wrapper around `k-bucket`, to provide easy store and
 * retrieval for peers.
 */
export class RoutingTable implements Startable {
  public kBucketSize: number
  public kb?: KBucketTree
  public pingQueue: Queue

  private readonly log: Logger
  private readonly components: RoutingTableComponents
  private readonly lan: boolean
  private readonly pingTimeout: number
  private readonly pingConcurrency: number
  private running: boolean
  private readonly protocol: string
  private readonly tagName: string
  private readonly tagValue: number
  private metrics?: {
    routingTableSize: Metric
    pingQueueSize: Metric
    pingRunning: Metric
  }

  constructor (components: RoutingTableComponents, init: RoutingTableInit) {
    const { kBucketSize, pingTimeout, lan, pingConcurrency, protocol, tagName, tagValue } = init

    this.components = components
    this.log = logger(`libp2p:kad-dht:${lan ? 'lan' : 'wan'}:routing-table`)
    this.kBucketSize = kBucketSize ?? KBUCKET_SIZE
    this.pingTimeout = pingTimeout ?? PING_TIMEOUT
    this.pingConcurrency = pingConcurrency ?? PING_CONCURRENCY
    this.lan = lan
    this.running = false
    this.protocol = protocol
    this.tagName = tagName ?? KAD_CLOSE_TAG_NAME
    this.tagValue = tagValue ?? KAD_CLOSE_TAG_VALUE

    const updatePingQueueSizeMetric = (): void => {
      this.metrics?.pingQueueSize.update(this.pingQueue.size)
      this.metrics?.pingRunning.update(this.pingQueue.pending)
    }

    this.pingQueue = new Queue({ concurrency: this.pingConcurrency })
    this.pingQueue.addListener('add', updatePingQueueSizeMetric)
    this.pingQueue.addListener('next', updatePingQueueSizeMetric)

    this._onPing = this._onPing.bind(this)
  }

  isStarted (): boolean {
    return this.running
  }

  async start (): Promise<void> {
    this.running = true

    if (this.components.metrics != null) {
      this.metrics = {
        routingTableSize: this.components.metrics.registerMetric(`libp2p_kad_dht_${this.lan ? 'lan' : 'wan'}_routing_table_size`),
        pingQueueSize: this.components.metrics.registerMetric(`libp2p_kad_dht_${this.lan ? 'lan' : 'wan'}_ping_queue_size`),
        pingRunning: this.components.metrics.registerMetric(`libp2p_kad_dht_${this.lan ? 'lan' : 'wan'}_ping_running`)
      }
    }

    const kBuck: KBucketTree = new KBuck({
      localNodeId: await utils.convertPeerId(this.components.peerId),
      numberOfNodesPerKBucket: this.kBucketSize,
      numberOfNodesToPing: 1
    })
    this.kb = kBuck

    // test whether to evict peers
    kBuck.on('ping', this._onPing)

    // tag kad-close peers
    this._tagPeers(kBuck)
  }

  async stop (): Promise<void> {
    this.running = false
    this.pingQueue.clear()
    this.kb = undefined
  }

  /**
   * Keep track of our k-closest peers and tag them in the peer store as such
   * - this will lower the chances that connections to them get closed when
   * we reach connection limits
   */
  _tagPeers (kBuck: KBucketTree): void {
    let kClosest = new PeerSet()

    const updatePeerTags = utils.debounce(() => {
      const newClosest = new PeerSet(
        kBuck.closest(kBuck.localNodeId, KBUCKET_SIZE).map(contact => contact.peer)
      )
      const addedPeers = newClosest.difference(kClosest)
      const removedPeers = kClosest.difference(newClosest)

      Promise.resolve()
        .then(async () => {
          for (const peer of addedPeers) {
            await this.components.peerStore.tagPeer(peer, this.tagName, {
              value: this.tagValue
            })
          }

          for (const peer of removedPeers) {
            await this.components.peerStore.unTagPeer(peer, this.tagName)
          }
        })
        .catch(err => {
          this.log.error('Could not update peer tags', err)
        })

      kClosest = newClosest
    })

    kBuck.on('added', () => {
      updatePeerTags()
    })
    kBuck.on('removed', () => {
      updatePeerTags()
    })
  }

  /**
   * Called on the `ping` event from `k-bucket` when a bucket is full
   * and cannot split.
   *
   * `oldContacts.length` is defined by the `numberOfNodesToPing` param
   * passed to the `k-bucket` constructor.
   *
   * `oldContacts` will not be empty and is the list of contacts that
   * have not been contacted for the longest.
   */
  _onPing (oldContacts: KBucketPeer[], newContact: KBucketPeer): void {
    // add to a queue so multiple ping requests do not overlap and we don't
    // flood the network with ping requests if lots of newContact requests
    // are received
    this.pingQueue.add(async () => {
      if (!this.running) {
        return
      }

      let responded = 0

      try {
        await Promise.all(
          oldContacts.map(async oldContact => {
            let timeoutController

            try {
              timeoutController = new TimeoutController(this.pingTimeout)

              const options = {
                signal: timeoutController.signal
              }

              this.log('pinging old contact %p', oldContact.peer)
              const connection = await this.components.connectionManager.openConnection(oldContact.peer, options)
              const stream = await connection.newStream(this.protocol, options)
              stream.close()
              responded++
            } catch (err: any) {
              if (this.running && this.kb != null) {
                // only evict peers if we are still running, otherwise we evict when dialing is
                // cancelled due to shutdown in progress
                this.log.error('could not ping peer %p', oldContact.peer, err)
                this.log('evicting old contact after ping failed %p', oldContact)
                this.kb.remove(oldContact.id)
              }
            } finally {
              if (timeoutController != null) {
                timeoutController.clear()
              }

              this.metrics?.routingTableSize.update(this.size)
            }
          })
        )

        if (this.running && responded < oldContacts.length && this.kb != null) {
          this.log('adding new contact %p', newContact.peer)
          this.kb.add(newContact)
        }
      } catch (err: any) {
        this.log.error('could not process k-bucket ping event', err)
      }
    })
      .catch(err => {
        this.log.error('could not process k-bucket ping event', err)
      })
  }

  // -- Public Interface

  /**
   * Amount of currently stored peers
   */
  get size (): number {
    if (this.kb == null) {
      return 0
    }

    return this.kb.count()
  }

  /**
   * Find a specific peer by id
   */
  async find (peer: PeerId): Promise<PeerId | undefined> {
    const key = await utils.convertPeerId(peer)
    const closest = this.closestPeer(key)

    if (closest != null && peer.equals(closest)) {
      return closest
    }

    return undefined
  }

  /**
   * Retrieve the closest peers to the given key
   */
  closestPeer (key: Uint8Array): PeerId | undefined {
    const res = this.closestPeers(key, 1)

    if (res.length > 0) {
      return res[0]
    }

    return undefined
  }

  /**
   * Retrieve the `count`-closest peers to the given key
   */
  closestPeers (key: Uint8Array, count = this.kBucketSize): PeerId[] {
    if (this.kb == null) {
      return []
    }

    const closest = this.kb.closest(key, count)

    return closest.map(p => p.peer)
  }

  /**
   * Add or update the routing table with the given peer
   */
  async add (peer: PeerId): Promise<void> {
    if (this.kb == null) {
      throw new Error('RoutingTable is not started')
    }

    const id = await utils.convertPeerId(peer)

    this.kb.add({ id, peer })

    this.log('added %p with kad id %b', peer, id)

    this.metrics?.routingTableSize.update(this.size)
  }

  /**
   * Remove a given peer from the table
   */
  async remove (peer: PeerId): Promise<void> {
    if (this.kb == null) {
      throw new Error('RoutingTable is not started')
    }

    const id = await utils.convertPeerId(peer)

    this.kb.remove(id)

    this.metrics?.routingTableSize.update(this.size)
  }
}
