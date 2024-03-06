import { CodeError, TypedEventEmitter } from '@libp2p/interface'
import { PeerSet } from '@libp2p/peer-collections'
import { PeerQueue } from '@libp2p/utils/peer-queue'
import { pbStream } from 'it-protobuf-stream'
import { Message, MessageType } from '../message/dht.js'
import * as utils from '../utils.js'
import { KBucket, type PingEventDetails } from './k-bucket.js'
import type { ComponentLogger, Logger, Metric, Metrics, PeerId, PeerStore, Startable, Stream } from '@libp2p/interface'
import type { ConnectionManager } from '@libp2p/interface-internal'

export const KAD_CLOSE_TAG_NAME = 'kad-close'
export const KAD_CLOSE_TAG_VALUE = 50
export const KBUCKET_SIZE = 20
export const PING_TIMEOUT = 10000
export const PING_CONCURRENCY = 10

export interface RoutingTableInit {
  logPrefix: string
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
  logger: ComponentLogger
}

export interface RoutingTableEvents {
  'peer:add': CustomEvent<PeerId>
  'peer:remove': CustomEvent<PeerId>
}

/**
 * A wrapper around `k-bucket`, to provide easy store and
 * retrieval for peers.
 */
export class RoutingTable extends TypedEventEmitter<RoutingTableEvents> implements Startable {
  public kBucketSize: number
  public kb?: KBucket
  public pingQueue: PeerQueue<boolean>

  private readonly log: Logger
  private readonly components: RoutingTableComponents
  private readonly pingTimeout: number
  private readonly pingConcurrency: number
  private running: boolean
  private readonly protocol: string
  private readonly tagName: string
  private readonly tagValue: number
  private readonly metrics?: {
    routingTableSize: Metric
  }

  constructor (components: RoutingTableComponents, init: RoutingTableInit) {
    super()

    const { kBucketSize, pingTimeout, logPrefix, pingConcurrency, protocol, tagName, tagValue } = init

    this.components = components
    this.log = components.logger.forComponent(`${logPrefix}:routing-table`)
    this.kBucketSize = kBucketSize ?? KBUCKET_SIZE
    this.pingTimeout = pingTimeout ?? PING_TIMEOUT
    this.pingConcurrency = pingConcurrency ?? PING_CONCURRENCY
    this.running = false
    this.protocol = protocol
    this.tagName = tagName ?? KAD_CLOSE_TAG_NAME
    this.tagValue = tagValue ?? KAD_CLOSE_TAG_VALUE

    this.pingQueue = new PeerQueue({
      concurrency: this.pingConcurrency,
      metricName: `${logPrefix.replaceAll(':', '_')}_ping_queue`,
      metrics: this.components.metrics
    })
    this.pingQueue.addEventListener('error', evt => {
      this.log.error('error pinging peer', evt.detail)
    })

    if (this.components.metrics != null) {
      this.metrics = {
        routingTableSize: this.components.metrics.registerMetric(`${logPrefix.replaceAll(':', '_')}_routing_table_size`)
      }
    }
  }

  isStarted (): boolean {
    return this.running
  }

  async start (): Promise<void> {
    this.running = true

    const kBuck = new KBucket({
      localNodeId: await utils.convertPeerId(this.components.peerId),
      numberOfNodesPerKBucket: this.kBucketSize,
      numberOfNodesToPing: 1
    })
    this.kb = kBuck

    // test whether to evict peers
    kBuck.addEventListener('ping', (evt) => {
      this._onPing(evt).catch(err => {
        this.log.error('could not process k-bucket ping event', err)
      })
    })

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
  _tagPeers (kBuck: KBucket): void {
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
            await this.components.peerStore.merge(peer, {
              tags: {
                [this.tagName]: {
                  value: this.tagValue
                }
              }
            })
          }

          for (const peer of removedPeers) {
            await this.components.peerStore.merge(peer, {
              tags: {
                [this.tagName]: undefined
              }
            })
          }
        })
        .catch(err => {
          this.log.error('Could not update peer tags', err)
        })

      kClosest = newClosest
    })

    kBuck.addEventListener('added', (evt) => {
      updatePeerTags()

      this.safeDispatchEvent('peer:add', { detail: evt.detail.peer })
    })
    kBuck.addEventListener('removed', (evt) => {
      updatePeerTags()

      this.safeDispatchEvent('peer:remove', { detail: evt.detail.peer })
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
  async _onPing (evt: CustomEvent<PingEventDetails>): Promise<void> {
    if (!this.running) {
      return
    }

    const {
      oldContacts,
      newContact
    } = evt.detail

    const results = await Promise.all(
      oldContacts.map(async oldContact => {
        // if a previous ping wants us to ping this contact, re-use the result
        const pingJob = this.pingQueue.find(oldContact.peer)

        if (pingJob != null) {
          return pingJob.join()
        }

        return this.pingQueue.add(async () => {
          let stream: Stream | undefined

          try {
            const options = {
              signal: AbortSignal.timeout(this.pingTimeout)
            }

            this.log('pinging old contact %p', oldContact.peer)
            const connection = await this.components.connectionManager.openConnection(oldContact.peer, options)
            stream = await connection.newStream(this.protocol, options)

            const pb = pbStream(stream)
            await pb.write({
              type: MessageType.PING
            }, Message, options)
            const response = await pb.read(Message, options)

            await pb.unwrap().close()

            if (response.type !== MessageType.PING) {
              throw new CodeError(`Incorrect message type received, expected PING got ${response.type}`, 'ERR_BAD_PING_RESPONSE')
            }

            return true
          } catch (err: any) {
            if (this.running && this.kb != null) {
              // only evict peers if we are still running, otherwise we evict
              // when dialing is cancelled due to shutdown in progress
              this.log.error('could not ping peer %p', oldContact.peer, err)
              this.log('evicting old contact after ping failed %p', oldContact.peer)
              this.kb.remove(oldContact.id)
            }

            stream?.abort(err)

            return false
          } finally {
            this.metrics?.routingTableSize.update(this.size)
          }
        }, {
          peerId: oldContact.peer
        })
      })
    )

    const responded = results
      .filter(res => res)
      .length

    if (this.running && responded < oldContacts.length && this.kb != null) {
      this.log('adding new contact %p', newContact.peer)
      this.kb.add(newContact)
    }
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
