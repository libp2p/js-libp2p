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
import type { QueryEvent, QueryOptions } from '@libp2p/interface-dht'
import { PeerSet } from '@libp2p/peer-collections'
import type { Metric, Metrics } from '@libp2p/interface-metrics'

export interface CleanUpEvents {
  'cleanup': CustomEvent
}

export interface QueryManagerInit {
  lan?: boolean
  disjointPaths?: number
  alpha?: number
}

export interface QueryManagerComponents {
  peerId: PeerId
  metrics?: Metrics
}

/**
 * Keeps track of all running queries
 */
export class QueryManager implements Startable {
  private readonly components: QueryManagerComponents
  private readonly lan: boolean
  public disjointPaths: number
  private readonly alpha: number
  private readonly controllers: Set<AbortController>
  private running: boolean
  private queries: number
  private metrics?: {
    runningQueries: Metric
    queryTime: Metric
  }

  constructor (components: QueryManagerComponents, init: QueryManagerInit) {
    const { lan = false, disjointPaths = K, alpha = ALPHA } = init

    this.components = components
    this.disjointPaths = disjointPaths ?? K
    this.controllers = new Set()
    this.running = false
    this.alpha = alpha ?? ALPHA
    this.lan = lan
    this.queries = 0
  }

  isStarted (): boolean {
    return this.running
  }

  /**
   * Starts the query manager
   */
  async start (): Promise<void> {
    this.running = true

    if (this.components.metrics != null && this.metrics == null) {
      this.metrics = {
        runningQueries: this.components.metrics.registerMetric(`libp2p_kad_dht_${this.lan ? 'lan' : 'wan'}_running_queries`),
        queryTime: this.components.metrics.registerMetric(`libp2p_kad_dht_${this.lan ? 'lan' : 'wan'}_query_time_seconds`)
      }
    }
  }

  /**
   * Stops all queries
   */
  async stop (): Promise<void> {
    this.running = false

    for (const controller of this.controllers) {
      controller.abort()
    }

    this.controllers.clear()
  }

  async * run (key: Uint8Array, peers: PeerId[], queryFunc: QueryFunc, options: QueryOptions = {}): AsyncGenerator<QueryEvent> {
    if (!this.running) {
      throw new Error('QueryManager not started')
    }

    const stopQueryTimer = this.metrics?.queryTime.timer()
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
      this.metrics?.runningQueries.update(this.queries)

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
          ourPeerId: this.components.peerId,
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
      this.metrics?.runningQueries.update(this.queries)

      if (stopQueryTimer != null) {
        stopQueryTimer()
      }

      cleanUp.dispatchEvent(new CustomEvent('cleanup'))
      log('query:done in %dms', Date.now() - startTime)
    }
  }
}
