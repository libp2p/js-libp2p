import { TypedEventEmitter, CustomEvent, setMaxListeners } from '@libp2p/interface'
import { PeerSet } from '@libp2p/peer-collections'
import { anySignal } from 'any-signal'
import merge from 'it-merge'
import { raceSignal } from 'race-signal'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import {
  ALPHA, K, DEFAULT_QUERY_TIMEOUT
} from '../constants.js'
import { convertBuffer } from '../utils.js'
import { queryPath } from './query-path.js'
import type { QueryFunc } from './types.js'
import type { QueryEvent } from '../index.js'
import type { RoutingTable } from '../routing-table/index.js'
import type { ComponentLogger, Metric, Metrics, PeerId, RoutingOptions, Startable } from '@libp2p/interface'
import type { DeferredPromise } from 'p-defer'

export interface CleanUpEvents {
  'cleanup': CustomEvent
}

export interface QueryManagerInit {
  logPrefix: string
  disjointPaths?: number
  alpha?: number
  initialQuerySelfHasRun: DeferredPromise<void>
  routingTable: RoutingTable
}

export interface QueryManagerComponents {
  peerId: PeerId
  metrics?: Metrics
  logger: ComponentLogger
}

export interface QueryOptions extends RoutingOptions {
  /**
   * A timeout for subqueries executed as part of the main query
   */
  queryFuncTimeout?: number

  isSelfQuery?: boolean
}

/**
 * Keeps track of all running queries
 */
export class QueryManager implements Startable {
  public disjointPaths: number
  private readonly alpha: number
  private shutDownController: AbortController
  private running: boolean
  private queries: number
  private readonly logger: ComponentLogger
  private readonly peerId: PeerId
  private readonly routingTable: RoutingTable
  private initialQuerySelfHasRun?: DeferredPromise<void>
  private readonly logPrefix: string
  private readonly metrics?: {
    runningQueries: Metric
    queryTime: Metric
  }

  constructor (components: QueryManagerComponents, init: QueryManagerInit) {
    const { disjointPaths = K, alpha = ALPHA, logPrefix } = init

    this.logPrefix = logPrefix
    this.disjointPaths = disjointPaths ?? K
    this.running = false
    this.alpha = alpha ?? ALPHA
    this.queries = 0
    this.initialQuerySelfHasRun = init.initialQuerySelfHasRun
    this.routingTable = init.routingTable
    this.logger = components.logger
    this.peerId = components.peerId

    if (components.metrics != null) {
      this.metrics = {
        runningQueries: components.metrics.registerMetric(`${logPrefix.replaceAll(':', '_')}_running_queries`),
        queryTime: components.metrics.registerMetric(`${logPrefix.replaceAll(':', '_')}_query_time_seconds`)
      }
    }

    // allow us to stop queries on shut down
    this.shutDownController = new AbortController()
    // make sure we don't make a lot of noise in the logs
    setMaxListeners(Infinity, this.shutDownController.signal)
  }

  isStarted (): boolean {
    return this.running
  }

  /**
   * Starts the query manager
   */
  async start (): Promise<void> {
    this.running = true

    // allow us to stop queries on shut down
    this.shutDownController = new AbortController()
    // make sure we don't make a lot of noise in the logs
    setMaxListeners(Infinity, this.shutDownController.signal)
  }

  /**
   * Stops all queries
   */
  async stop (): Promise<void> {
    this.running = false

    this.shutDownController.abort()
  }

  async * run (key: Uint8Array, queryFunc: QueryFunc, options: QueryOptions = {}): AsyncGenerator<QueryEvent> {
    if (!this.running) {
      throw new Error('QueryManager not started')
    }

    const stopQueryTimer = this.metrics?.queryTime.timer()

    if (options.signal == null) {
      // don't let queries run forever
      const signal = AbortSignal.timeout(DEFAULT_QUERY_TIMEOUT)

      // this signal will get listened to for network requests, etc
      // so make sure we don't make a lot of noise in the logs
      setMaxListeners(Infinity, signal)

      options = {
        ...options,
        signal
      }
    }

    // if the user breaks out of a for..await of loop iterating over query
    // results we need to cancel any in-flight network requests
    const queryEarlyExitController = new AbortController()

    const signal = anySignal([
      this.shutDownController.signal,
      queryEarlyExitController.signal,
      options.signal
    ])

    // this signal will get listened to for every invocation of queryFunc
    // so make sure we don't make a lot of noise in the logs
    setMaxListeners(Infinity, signal, queryEarlyExitController.signal)

    const log = this.logger.forComponent(`${this.logPrefix}:query:` + uint8ArrayToString(key, 'base58btc'))

    // query a subset of peers up to `kBucketSize / 2` in length
    const startTime = Date.now()
    const cleanUp = new TypedEventEmitter<CleanUpEvents>()
    let queryFinished = false

    try {
      if (options.isSelfQuery !== true && this.initialQuerySelfHasRun != null) {
        log('waiting for initial query-self query before continuing')

        await raceSignal(this.initialQuerySelfHasRun.promise, signal)

        this.initialQuerySelfHasRun = undefined
      }

      log('query:start')
      this.queries++
      this.metrics?.runningQueries.update(this.queries)

      const id = await convertBuffer(key)
      const peers = this.routingTable.closestPeers(id)
      const peersToQuery = peers.slice(0, Math.min(this.disjointPaths, peers.length))

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
          ourPeerId: this.peerId,
          signal,
          query: queryFunc,
          pathIndex: index,
          numPaths: peersToQuery.length,
          alpha: this.alpha,
          cleanUp,
          queryFuncTimeout: options.queryFuncTimeout,
          log,
          peersSeen,
          onProgress: options.onProgress
        })
      })

      // Execute the query along each disjoint path and yield their results as they become available
      for await (const event of merge(...paths)) {
        if (event.name === 'QUERY_ERROR') {
          log.error('query error', event.error)
        }

        yield event
      }

      queryFinished = true
    } catch (err: any) {
      if (!this.running && err.code === 'ERR_QUERY_ABORTED') {
        // ignore query aborted errors that were thrown during query manager shutdown
      } else {
        throw err
      }
    } finally {
      if (!queryFinished) {
        log('query exited early')
        queryEarlyExitController.abort()
      }

      signal.clear()

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
