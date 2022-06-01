// @ts-expect-error no types
import KBuck from 'k-bucket'
import * as utils from '../utils.js'
import Queue from 'p-queue'
import { TimeoutController } from 'timeout-abort-controller'
import { logger } from '@libp2p/logger'
import type { PeerId } from '@libp2p/interfaces/peer-id'
import type { Startable } from '@libp2p/interfaces/startable'
import type { Logger } from '@libp2p/logger'
import { Components, Initializable } from '@libp2p/interfaces/components'

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

export interface KBucketTree {
  root: KBucket
  localNodeId: Uint8Array
  on: (event: 'ping', callback: (oldContacts: KBucketPeer[], newContact: KBucketPeer) => void) => void
  closest: (key: Uint8Array, count: number) => KBucketPeer[]
  closestPeer: (key: Uint8Array) => KBucketPeer
  remove: (key: Uint8Array) => void
  add: (peer: KBucketPeer) => void
  get: (key: Uint8Array) => Uint8Array
  count: () => number
  toIterable: () => Iterable<KBucket>
}

const METRIC_ROUTING_TABLE_SIZE = 'routing-table-size'
const METRIC_PING_QUEUE_SIZE = 'ping-queue-size'
const METRIC_PING_RUNNING = 'ping-running'

export interface RoutingTableInit {
  lan: boolean
  protocol: string
  kBucketSize?: number
  pingTimeout?: number
  pingConcurrency?: number
}

/**
 * A wrapper around `k-bucket`, to provide easy store and
 * retrieval for peers.
 */
export class RoutingTable implements Startable, Initializable {
  public kBucketSize: number
  public kb?: KBucketTree
  public pingQueue: Queue

  private readonly log: Logger
  private components: Components = new Components()
  private readonly lan: boolean
  private readonly pingTimeout: number
  private readonly pingConcurrency: number
  private running: boolean
  private readonly protocol: string

  constructor (init: RoutingTableInit) {
    const { kBucketSize, pingTimeout, lan, pingConcurrency, protocol } = init

    this.log = logger(`libp2p:kad-dht:${lan ? 'lan' : 'wan'}:routing-table`)
    this.kBucketSize = kBucketSize ?? 20
    this.pingTimeout = pingTimeout ?? 10000
    this.pingConcurrency = pingConcurrency ?? 10
    this.lan = lan
    this.running = false
    this.protocol = protocol

    const updatePingQueueSizeMetric = () => {
      this.components.getMetrics()?.updateComponentMetric({
        system: 'libp2p',
        component: `kad-dht-${this.lan ? 'lan' : 'wan'}`,
        metric: METRIC_PING_QUEUE_SIZE,
        value: this.pingQueue.size
      })
      this.components.getMetrics()?.updateComponentMetric({
        system: 'libp2p',
        component: `kad-dht-${this.lan ? 'lan' : 'wan'}`,
        metric: METRIC_PING_RUNNING,
        value: this.pingQueue.pending
      })
    }

    this.pingQueue = new Queue({ concurrency: this.pingConcurrency })
    this.pingQueue.addListener('add', updatePingQueueSizeMetric)
    this.pingQueue.addListener('next', updatePingQueueSizeMetric)

    this._onPing = this._onPing.bind(this)
  }

  init (components: Components): void {
    this.components = components
  }

  isStarted () {
    return this.running
  }

  async start () {
    this.running = true

    const kBuck = new KBuck({
      localNodeId: await utils.convertPeerId(this.components.getPeerId()),
      numberOfNodesPerKBucket: this.kBucketSize,
      numberOfNodesToPing: 1
    })
    kBuck.on('ping', this._onPing)
    this.kb = kBuck
  }

  async stop () {
    this.running = false
    this.pingQueue.clear()
    this.kb = undefined
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
  _onPing (oldContacts: KBucketPeer[], newContact: KBucketPeer) {
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
              const connection = await this.components.getConnectionManager().openConnection(oldContact.peer, options)
              const { stream } = await connection.newStream(this.protocol, options)
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

              this.components.getMetrics()?.updateComponentMetric({
                system: 'libp2p',
                component: `kad-dht-${this.lan ? 'lan' : 'wan'}`,
                metric: METRIC_ROUTING_TABLE_SIZE,
                value: this.size
              })
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
  get size () {
    if (this.kb == null) {
      return 0
    }

    return this.kb.count()
  }

  /**
   * Find a specific peer by id
   */
  async find (peer: PeerId) {
    const key = await utils.convertPeerId(peer)
    const closest = this.closestPeer(key)

    if (closest != null && peer.equals(closest)) {
      return closest
    }
  }

  /**
   * Retrieve the closest peers to the given key
   */
  closestPeer (key: Uint8Array) {
    const res = this.closestPeers(key, 1)

    if (res.length > 0) {
      return res[0]
    }
  }

  /**
   * Retrieve the `count`-closest peers to the given key
   */
  closestPeers (key: Uint8Array, count = this.kBucketSize) {
    if (this.kb == null) {
      return []
    }

    const closest = this.kb.closest(key, count)

    return closest.map(p => p.peer)
  }

  /**
   * Add or update the routing table with the given peer
   */
  async add (peer: PeerId) {
    if (this.kb == null) {
      throw new Error('RoutingTable is not started')
    }

    const id = await utils.convertPeerId(peer)

    this.kb.add({ id: id, peer: peer })

    this.log('added %p with kad id %b', peer, id)

    this.components.getMetrics()?.updateComponentMetric({
      system: 'libp2p',
      component: `kad-dht-${this.lan ? 'lan' : 'wan'}`,
      metric: METRIC_ROUTING_TABLE_SIZE,
      value: this.size
    })
  }

  /**
   * Remove a given peer from the table
   */
  async remove (peer: PeerId) {
    if (this.kb == null) {
      throw new Error('RoutingTable is not started')
    }

    const id = await utils.convertPeerId(peer)

    this.kb.remove(id)

    this.components.getMetrics()?.updateComponentMetric({
      system: 'libp2p',
      component: `kad-dht-${this.lan ? 'lan' : 'wan'}`,
      metric: METRIC_ROUTING_TABLE_SIZE,
      value: this.size
    })
  }
}
