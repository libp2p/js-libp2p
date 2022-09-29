import { TimeoutController } from 'timeout-abort-controller'
import { anySignal } from 'any-signal'
import {
  ALPHA, K, DEFAULT_QUERY_TIMEOUT
} from '../constants.js'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { queryPath } from './query-path.js'
import merge from 'it-merge'
import { setMaxListeners } from 'events'
import { EventEmitter, CustomEvent } from '@libp2p/interfaces/events'
import { logger } from '@libp2p/logger'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { Startable } from '@libp2p/interfaces/startable'
import type { QueryFunc } from './types.js'
import type { QueryOptions } from '@libp2p/interface-dht'
import { Components, Initializable } from '@libp2p/components'
import { PeerSet } from '@libp2p/peer-collections'

const METRIC_RUNNING_QUERIES = 'running-queries'

export interface CleanUpEvents {
  'cleanup': CustomEvent
}

export interface QueryManagerInit {
  lan?: boolean
  disjointPaths?: number
  alpha?: number
}

/**
 * Keeps track of all running queries
 */
export class QueryManager implements Startable, Initializable {
  private components: Components = new Components()
  private readonly lan: boolean
  public disjointPaths: number
  private readonly alpha: number
  private readonly controllers: Set<AbortController>
  private running: boolean
  private queries: number

  constructor (init: QueryManagerInit) {
    const { lan = false, disjointPaths = K, alpha = ALPHA } = init
    this.disjointPaths = disjointPaths ?? K
    this.controllers = new Set()
    this.running = false
    this.alpha = alpha ?? ALPHA
    this.lan = lan
    this.queries = 0
  }

  init (components: Components): void {
    this.components = components
  }

  isStarted () {
    return this.running
  }

  /**
   * Starts the query manager
   */
  async start () {
    this.running = true
  }

  /**
   * Stops all queries
   */
  async stop () {
    this.running = false

    for (const controller of this.controllers) {
      controller.abort()
    }

    this.controllers.clear()
  }

  async * run (key: Uint8Array, peers: PeerId[], queryFunc: QueryFunc, options: QueryOptions = {}) {
    if (!this.running) {
      throw new Error('QueryManager not started')
    }

    let timeoutController

    if (options.signal == null) {
      // don't let queries run forever
      timeoutController = new TimeoutController(DEFAULT_QUERY_TIMEOUT)
      options.signal = timeoutController.signal

      // this signal will get listened to for network requests, etc
      // so make sure we don't make a lot of noise in the logs
      try {
        if (setMaxListeners != null) {
          setMaxListeners(Infinity, timeoutController.signal)
        }
      } catch {} // fails on node < 15.4
    }

    // allow us to stop queries on shut down
    const abortController = new AbortController()
    this.controllers.add(abortController)
    const signals = [abortController.signal]

    if (options.signal != null) {
      signals.push(options.signal)
    }

    const signal = anySignal(signals)

    // this signal will get listened to for every invocation of queryFunc
    // so make sure we don't make a lot of noise in the logs
    try {
      if (setMaxListeners != null) {
        setMaxListeners(Infinity, signal)
      }
    } catch {} // fails on node < 15.4

    const log = logger(`libp2p:kad-dht:${this.lan ? 'lan' : 'wan'}:query:` + uint8ArrayToString(key, 'base58btc'))

    // query a subset of peers up to `kBucketSize / 2` in length
    const peersToQuery = peers.slice(0, Math.min(this.disjointPaths, peers.length))
    const startTime = Date.now()
    const cleanUp = new EventEmitter<CleanUpEvents>()

    try {
      log('query:start')
      this.queries++
      this.components.getMetrics()?.updateComponentMetric({
        system: 'libp2p',
        component: `kad-dht-${this.lan ? 'lan' : 'wan'}`,
        metric: METRIC_RUNNING_QUERIES,
        value: this.queries
      })

      if (peers.length === 0) {
        log.error('Running query with no peers')
        return
      }

      // make sure we don't get trapped in a loop
      const peersSeen = new PeerSet()

      // Create query paths from the starting peers
      const paths = peersToQuery.map((peer, index) => {
        return queryPath({
          key,
          startingPeer: peer,
          ourPeerId: this.components.getPeerId(),
          signal,
          query: queryFunc,
          pathIndex: index,
          numPaths: peersToQuery.length,
          alpha: this.alpha,
          cleanUp,
          queryFuncTimeout: options.queryFuncTimeout,
          log,
          peersSeen
        })
      })

      // Execute the query along each disjoint path and yield their results as they become available
      for await (const event of merge(...paths)) {
        yield event

        if (event.name === 'QUERY_ERROR') {
          log('error', event.error)
        }
      }
    } catch (err: any) {
      if (!this.running && err.code === 'ERR_QUERY_ABORTED') {
        // ignore query aborted errors that were thrown during query manager shutdown
      } else {
        throw err
      }
    } finally {
      this.controllers.delete(abortController)

      if (timeoutController != null) {
        timeoutController.clear()
      }

      this.queries--
      this.components.getMetrics()?.updateComponentMetric({
        system: 'libp2p',
        component: `kad-dht-${this.lan ? 'lan' : 'wan'}`,
        metric: METRIC_RUNNING_QUERIES,
        value: this.queries
      })

      cleanUp.dispatchEvent(new CustomEvent('cleanup'))
      log('query:done in %dms', Date.now() - startTime)
    }
  }
}
