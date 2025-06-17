import { start, stop } from '@libp2p/interface'
import { AdaptiveTimeout } from '@libp2p/utils/adaptive-timeout'
import { PeerQueue } from '@libp2p/utils/peer-queue'
import { anySignal } from 'any-signal'
import parallel from 'it-parallel'
import { TypedEventEmitter, setMaxListeners } from 'main-event'
import * as utils from '../utils.js'
import { ClosestPeers } from './closest-peers.js'
import { KBucket, isLeafBucket } from './k-bucket.js'
import type { Bucket, GetClosestPeersOptions, LeafBucket, Peer } from './k-bucket.js'
import type { Network } from '../network.js'
import type { AbortOptions, ComponentLogger, CounterGroup, Logger, Metric, Metrics, PeerId, PeerStore, Startable, Stream } from '@libp2p/interface'
import type { Ping } from '@libp2p/ping'
import type { AdaptiveTimeoutInit } from '@libp2p/utils/adaptive-timeout'

export const KBUCKET_SIZE = 20
export const PREFIX_LENGTH = 6
export const PING_NEW_CONTACT_TIMEOUT = 2000
export const PING_NEW_CONTACT_CONCURRENCY = 20
export const PING_NEW_CONTACT_MAX_QUEUE_SIZE = 100
export const PING_OLD_CONTACT_COUNT = 3
export const PING_OLD_CONTACT_TIMEOUT = 2000
export const PING_OLD_CONTACT_CONCURRENCY = 20
export const PING_OLD_CONTACT_MAX_QUEUE_SIZE = 100
export const KAD_PEER_TAG_NAME = 'kad-peer'
export const KAD_PEER_TAG_VALUE = 1
export const LAST_PING_THRESHOLD = 600000
export const POPULATE_FROM_DATASTORE_ON_START = true
export const POPULATE_FROM_DATASTORE_LIMIT = 1000

export interface RoutingTableInit {
  logPrefix: string
  metricsPrefix: string
  protocol: string
  prefixLength?: number
  splitThreshold?: number
  kBucketSize?: number
  pingNewContactTimeout?: AdaptiveTimeoutInit
  pingNewContactConcurrency?: number
  pingNewContactMaxQueueSize?: number
  pingOldContactTimeout?: AdaptiveTimeoutInit
  pingOldContactConcurrency?: number
  pingOldContactMaxQueueSize?: number
  numberOfOldContactsToPing?: number
  peerTagName?: string
  peerTagValue?: number
  closeTagName?: string
  closeTagValue?: number
  network: Network
  populateFromDatastoreOnStart?: boolean
  populateFromDatastoreLimit?: number
  lastPingThreshold?: number
  closestPeerSetSize?: number
  closestPeerSetRefreshInterval?: number
}

export interface RoutingTableComponents {
  peerId: PeerId
  peerStore: PeerStore
  metrics?: Metrics
  logger: ComponentLogger
  ping: Ping
}

export interface RoutingTableEvents {
  'peer:add': CustomEvent<PeerId>
  'peer:remove': CustomEvent<PeerId>
  'peer:ping': CustomEvent<PeerId>
}

/**
 * A wrapper around `k-bucket`, to provide easy store and retrieval for peers.
 */
export class RoutingTable extends TypedEventEmitter<RoutingTableEvents> implements Startable {
  public kBucketSize: number
  public kb: KBucket
  public network: Network
  private readonly closestPeerTagger: ClosestPeers
  private readonly log: Logger
  private readonly components: RoutingTableComponents
  private running: boolean
  private readonly pingNewContactTimeout: AdaptiveTimeout
  private readonly pingNewContactQueue: PeerQueue<boolean>
  private readonly pingOldContactTimeout: AdaptiveTimeout
  private readonly pingOldContactQueue: PeerQueue<boolean>
  private readonly populateFromDatastoreOnStart: boolean
  private readonly populateFromDatastoreLimit: number
  private readonly protocol: string
  private readonly peerTagName: string
  private readonly peerTagValue: number
  private readonly metrics?: {
    routingTableSize: Metric
    routingTableKadBucketTotal: Metric
    routingTableKadBucketAverageOccupancy: Metric
    routingTableKadBucketMaxDepth: Metric
    routingTableKadBucketMinOccupancy: Metric
    routingTableKadBucketMaxOccupancy: Metric
    kadBucketEvents: CounterGroup<'ping_old_contact' | 'ping_old_contact_error' | 'ping_new_contact' | 'ping_new_contact_error' | 'peer_added' | 'peer_removed'>
  }

  private shutdownController: AbortController

  constructor (components: RoutingTableComponents, init: RoutingTableInit) {
    super()

    this.components = components
    this.log = components.logger.forComponent(`${init.logPrefix}:routing-table`)
    this.kBucketSize = init.kBucketSize ?? KBUCKET_SIZE
    this.running = false
    this.protocol = init.protocol
    this.network = init.network
    this.peerTagName = init.peerTagName ?? KAD_PEER_TAG_NAME
    this.peerTagValue = init.peerTagValue ?? KAD_PEER_TAG_VALUE
    this.pingOldContacts = this.pingOldContacts.bind(this)
    this.verifyNewContact = this.verifyNewContact.bind(this)
    this.peerAdded = this.peerAdded.bind(this)
    this.peerRemoved = this.peerRemoved.bind(this)
    this.populateFromDatastoreOnStart = init.populateFromDatastoreOnStart ?? POPULATE_FROM_DATASTORE_ON_START
    this.populateFromDatastoreLimit = init.populateFromDatastoreLimit ?? POPULATE_FROM_DATASTORE_LIMIT
    this.shutdownController = new AbortController()

    this.pingOldContactQueue = new PeerQueue({
      concurrency: init.pingOldContactConcurrency ?? PING_OLD_CONTACT_CONCURRENCY,
      metricName: `${init.metricsPrefix}_ping_old_contact_queue`,
      metrics: this.components.metrics,
      maxSize: init.pingOldContactMaxQueueSize ?? PING_OLD_CONTACT_MAX_QUEUE_SIZE
    })
    this.pingOldContactTimeout = new AdaptiveTimeout({
      ...(init.pingOldContactTimeout ?? {}),
      metrics: this.components.metrics,
      metricName: `${init.metricsPrefix}_routing_table_ping_old_contact_time_milliseconds`
    })

    this.pingNewContactQueue = new PeerQueue({
      concurrency: init.pingNewContactConcurrency ?? PING_NEW_CONTACT_CONCURRENCY,
      metricName: `${init.metricsPrefix}_ping_new_contact_queue`,
      metrics: this.components.metrics,
      maxSize: init.pingNewContactMaxQueueSize ?? PING_NEW_CONTACT_MAX_QUEUE_SIZE
    })
    this.pingNewContactTimeout = new AdaptiveTimeout({
      ...(init.pingNewContactTimeout ?? {}),
      metrics: this.components.metrics,
      metricName: `${init.metricsPrefix}_routing_table_ping_new_contact_time_milliseconds`
    })

    this.kb = new KBucket(components, {
      kBucketSize: init.kBucketSize,
      prefixLength: init.prefixLength,
      splitThreshold: init.splitThreshold,
      numberOfOldContactsToPing: init.numberOfOldContactsToPing,
      lastPingThreshold: init.lastPingThreshold,
      ping: this.pingOldContacts,
      verify: this.verifyNewContact,
      onAdd: this.peerAdded,
      onRemove: this.peerRemoved,
      metricsPrefix: init.metricsPrefix
    })

    this.closestPeerTagger = new ClosestPeers(this.components, {
      logPrefix: init.logPrefix,
      routingTable: this,
      peerSetSize: init.closestPeerSetSize,
      refreshInterval: init.closestPeerSetRefreshInterval,
      closeTagName: init.closeTagName,
      closeTagValue: init.closeTagValue
    })

    if (this.components.metrics != null) {
      this.metrics = {
        routingTableSize: this.components.metrics.registerMetric(`${init.metricsPrefix}_routing_table_size`),
        routingTableKadBucketTotal: this.components.metrics.registerMetric(`${init.metricsPrefix}_routing_table_kad_bucket_total`),
        routingTableKadBucketAverageOccupancy: this.components.metrics.registerMetric(`${init.metricsPrefix}_routing_table_kad_bucket_average_occupancy`),
        routingTableKadBucketMinOccupancy: this.components.metrics.registerMetric(`${init.metricsPrefix}_routing_table_kad_bucket_min_occupancy`),
        routingTableKadBucketMaxOccupancy: this.components.metrics.registerMetric(`${init.metricsPrefix}_routing_table_kad_bucket_max_occupancy`),
        routingTableKadBucketMaxDepth: this.components.metrics.registerMetric(`${init.metricsPrefix}_routing_table_kad_bucket_max_depth`),
        kadBucketEvents: this.components.metrics.registerCounterGroup(`${init.metricsPrefix}_kad_bucket_events_total`)
      }
    }
  }

  isStarted (): boolean {
    return this.running
  }

  async start (): Promise<void> {
    if (this.running) {
      return
    }

    this.running = true

    this.shutdownController = new AbortController()
    await start(this.closestPeerTagger, this.kb)
  }

  async afterStart (): Promise<void> {
    let peerStorePeers = 0

    // do this async to not block startup but iterate serially to not overwhelm
    // the ping queue
    Promise.resolve().then(async () => {
      if (!this.populateFromDatastoreOnStart) {
        return
      }

      const signal = anySignal([
        this.shutdownController.signal,
        AbortSignal.timeout(20_000)
      ])
      setMaxListeners(Infinity, signal)

      try {
        // add existing peers from the peer store to routing table
        for (const peer of await this.components.peerStore.all({
          filters: [(peer) => {
            return peer.protocols.includes(this.protocol) && peer.tags.has(KAD_PEER_TAG_NAME)
          }],
          limit: this.populateFromDatastoreLimit,
          signal
        })) {
          if (!this.running) {
            // bail if we've been shut down
            return
          }

          try {
            await this.add(peer.id, {
              signal
            })
            peerStorePeers++
          } catch (err) {
            this.log('failed to add peer %p to routing table, removing kad-dht peer tags - %e')
            await this.components.peerStore.merge(peer.id, {
              tags: {
                [this.peerTagName]: undefined
              }
            })
          }
        }
      } finally {
        signal.clear()
      }

      this.log('added %d peer store peers to the routing table', peerStorePeers)
    })
      .catch(err => {
        this.log.error('error adding %d, peer store peers to the routing table - %e', peerStorePeers, err)
      })
  }

  async stop (): Promise<void> {
    this.running = false
    await stop(this.closestPeerTagger, this.kb)
    this.pingOldContactQueue.abort()
    this.pingNewContactQueue.abort()
    this.shutdownController.abort()
  }

  private async peerAdded (peer: Peer, bucket: LeafBucket, options?: AbortOptions): Promise<void> {
    if (!this.components.peerId.equals(peer.peerId)) {
      await this.components.peerStore.merge(peer.peerId, {
        tags: {
          [this.peerTagName]: {
            value: this.peerTagValue
          }
        }
      }, options)
    }

    this.updateMetrics()
    this.metrics?.kadBucketEvents.increment({ peer_added: true })
    this.safeDispatchEvent('peer:add', { detail: peer.peerId })
  }

  private async peerRemoved (peer: Peer, bucket: LeafBucket, options?: AbortOptions): Promise<void> {
    if (!this.components.peerId.equals(peer.peerId)) {
      await this.components.peerStore.merge(peer.peerId, {
        tags: {
          [this.peerTagName]: undefined
        }
      }, options)
    }

    this.updateMetrics()
    this.metrics?.kadBucketEvents.increment({ peer_removed: true })
    this.safeDispatchEvent('peer:remove', { detail: peer.peerId })
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
  async * pingOldContacts (oldContacts: Peer[], options?: AbortOptions): AsyncGenerator<Peer> {
    if (!this.running) {
      return
    }

    const jobs: Array<() => Promise<Peer | undefined>> = []

    for (const oldContact of oldContacts) {
      if (this.kb.get(oldContact.kadId) == null) {
        this.log('asked to ping contact %p that was not in routing table', oldContact.peerId)
        continue
      }

      this.metrics?.kadBucketEvents.increment({ ping_old_contact: true })

      jobs.push(async () => {
        // if a previous ping wants us to ping this contact, re-use the result
        const existingJob = this.pingOldContactQueue.find(oldContact.peerId)

        if (existingJob != null) {
          this.log('asked to ping contact %p was already being pinged', oldContact.peerId)
          const result = await existingJob.join(options)

          if (!result) {
            return oldContact
          }

          return
        }

        const result = await this.pingOldContactQueue.add(async (options) => {
          const signal = this.pingOldContactTimeout.getTimeoutSignal()
          const signals = anySignal([
            signal,
            this.shutdownController.signal,
            options?.signal
          ])
          setMaxListeners(Infinity, signal, signals)

          try {
            return await this.pingContact(oldContact, options)
          } catch {
            this.metrics?.kadBucketEvents.increment({ ping_old_contact_error: true })
            return true
          } finally {
            this.pingOldContactTimeout.cleanUp(signal)
            signals.clear()
          }
        }, {
          peerId: oldContact.peerId,
          signal: options?.signal
        })

        if (!result) {
          return oldContact
        }
      })
    }

    for await (const peer of parallel(jobs)) {
      if (peer != null) {
        yield peer
      }
    }
  }

  async verifyNewContact (contact: Peer, options?: AbortOptions): Promise<boolean> {
    const signal = this.pingNewContactTimeout.getTimeoutSignal()
    const signals = anySignal([
      signal,
      this.shutdownController.signal,
      options?.signal
    ])
    setMaxListeners(Infinity, signal, signals)

    try {
      const job = this.pingNewContactQueue.find(contact.peerId)

      if (job != null) {
        this.log('joining existing ping to add new peer %p to routing table', contact.peerId)
        return await job.join({
          signal: signals
        })
      } else {
        return await this.pingNewContactQueue.add(async (options) => {
          this.metrics?.kadBucketEvents.increment({ ping_new_contact: true })

          this.log('pinging new peer %p before adding to routing table', contact.peerId)
          return this.pingContact(contact, options)
        }, {
          peerId: contact.peerId,
          signal: signals
        })
      }
    } catch (err) {
      this.log.trace('tried to add peer %p but they were not online', contact.peerId)
      this.metrics?.kadBucketEvents.increment({ ping_new_contact_error: true })

      return false
    } finally {
      this.pingNewContactTimeout.cleanUp(signal)
      signals.clear()
    }
  }

  async pingContact (contact: Peer, options?: AbortOptions): Promise<boolean> {
    let stream: Stream | undefined

    try {
      this.log('pinging contact %p', contact.peerId)
      await this.components.ping.ping(contact.peerId, options)
      this.log('contact %p ping ok', contact.peerId)

      this.safeDispatchEvent('peer:ping', {
        detail: contact.peerId
      })

      return true
    } catch (err: any) {
      this.log('error pinging old contact %p - %e', contact.peerId, err)
      stream?.abort(err)
      return false
    }
  }

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
  async find (peer: PeerId, options?: AbortOptions): Promise<PeerId | undefined> {
    const kadId = await utils.convertPeerId(peer, options)
    return this.kb.get(kadId)?.peerId
  }

  /**
   * Retrieve the closest peers to the given kadId
   */
  closestPeer (kadId: Uint8Array): PeerId | undefined {
    const res = this.closestPeers(kadId, {
      count: 1
    })

    if (res.length > 0) {
      return res[0]
    }

    return undefined
  }

  /**
   * Retrieve the `count`-closest peers to the given kadId
   */
  closestPeers (kadId: Uint8Array, options?: GetClosestPeersOptions): PeerId[] {
    if (this.kb == null) {
      return []
    }

    return [...this.kb.closest(kadId, options)]
  }

  /**
   * Add or update the routing table with the given peer
   */
  async add (peerId: PeerId, options?: AbortOptions): Promise<void> {
    if (this.kb == null) {
      throw new Error('RoutingTable is not started')
    }

    await this.kb.add(peerId, options)
  }

  /**
   * Remove a given peer from the table
   */
  async remove (peer: PeerId, options?: AbortOptions): Promise<void> {
    if (this.kb == null) {
      throw new Error('RoutingTable is not started')
    }

    const kadId = await utils.convertPeerId(peer, options)

    await this.kb.remove(kadId, options)
  }

  private updateMetrics (): void {
    if (this.metrics == null || this.kb == null) {
      return
    }

    let size = 0
    let buckets = 0
    let maxDepth = 0
    let minOccupancy = 20
    let maxOccupancy = 0

    function count (bucket: Bucket): void {
      if (isLeafBucket(bucket)) {
        if (bucket.depth > maxDepth) {
          maxDepth = bucket.depth
        }

        buckets++
        size += bucket.peers.length

        if (bucket.peers.length < minOccupancy) {
          minOccupancy = bucket.peers.length
        }

        if (bucket.peers.length > maxOccupancy) {
          maxOccupancy = bucket.peers.length
        }

        return
      }

      count(bucket.left)
      count(bucket.right)
    }

    count(this.kb.root)

    this.metrics.routingTableSize.update(size)
    this.metrics.routingTableKadBucketTotal.update(buckets)
    this.metrics.routingTableKadBucketAverageOccupancy.update(Math.round(size / buckets))
    this.metrics.routingTableKadBucketMinOccupancy.update(minOccupancy)
    this.metrics.routingTableKadBucketMaxOccupancy.update(maxOccupancy)
    this.metrics.routingTableKadBucketMaxDepth.update(maxDepth)
  }
}
