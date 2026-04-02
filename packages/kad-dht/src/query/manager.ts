import { createScalableCuckooFilter, Queue } from '@libp2p/utils'
import { anySignal } from 'any-signal'
import merge from 'it-merge'
import { setMaxListeners } from 'main-event'
import { pEvent } from 'p-event'
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
import type { AbortOptions, ComponentLogger, Metrics, PeerId, RoutingOptions, Startable } from '@libp2p/interface'
import type { ConnectionManager } from '@libp2p/interface-internal'
import type { DeferredPromise } from 'p-defer'

export interface CleanUpEvents {
  cleanup: CustomEvent
}

export interface QueryManagerInit {
  logPrefix: string
  metricsPrefix: string
  disjointPaths?: number
  alpha?: number
  routingUpdateQueueConcurrency?: number
  routingUpdatePeerTtl?: number
  initialQuerySelfHasRun: DeferredPromise<void>
  allowQueryWithZeroPeers?: boolean
  routingTable: RoutingTable
}

export interface QueryManagerComponents {
  peerId: PeerId
  metrics?: Metrics
  logger: ComponentLogger
  connectionManager: ConnectionManager
}

export interface QueryOptions extends RoutingOptions {
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
  private readonly logger: ComponentLogger
  private readonly peerId: PeerId
  private readonly connectionManager: ConnectionManager
  private readonly routingTable: RoutingTable
  private readonly routingUpdateQueueConcurrency: number
  private readonly routingUpdatePeerTtl: number
  private readonly routingUpdateRecent: Map<string, number>
  private readonly routingUpdateInFlight: Set<string>
  private initialQuerySelfHasRun?: DeferredPromise<void>
  private readonly logPrefix: string
  private readonly allowQueryWithZeroPeers: boolean
  private routingUpdateQueue?: Queue<void>
  private routingUpdateStats: {
    enqueued: number
    deduped: number
    completed: number
    failed: number
    aborted: number
    cancelledBeforeStart: number
    ttlSkipped: number
  }

  constructor (components: QueryManagerComponents, init: QueryManagerInit) {
    this.logPrefix = init.logPrefix
    this.disjointPaths = init.disjointPaths ?? K
    this.alpha = init.alpha ?? ALPHA
    this.initialQuerySelfHasRun = init.initialQuerySelfHasRun
    this.routingTable = init.routingTable
    this.routingUpdateQueueConcurrency = init.routingUpdateQueueConcurrency ?? Math.max(1, Math.min(this.alpha * 2, 16))
    this.routingUpdatePeerTtl = init.routingUpdatePeerTtl ?? 30_000
    this.routingUpdateRecent = new Map()
    this.routingUpdateInFlight = new Set()
    this.logger = components.logger
    this.peerId = components.peerId
    this.connectionManager = components.connectionManager
    this.allowQueryWithZeroPeers = init.allowQueryWithZeroPeers ?? false
    const routingUpdateStats = {
      enqueued: 0,
      deduped: 0,
      completed: 0,
      failed: 0,
      aborted: 0,
      cancelledBeforeStart: 0,
      ttlSkipped: 0
    }
    this.routingUpdateStats = routingUpdateStats

    // allow us to stop queries on shut down
    this.shutDownController = new AbortController()
    // make sure we don't make a lot of noise in the logs
    setMaxListeners(Infinity, this.shutDownController.signal)

    this.running = false
  }

  getRoutingUpdateQueueStats (): {
    queued: number
    running: number
    total: number
    enqueued: number
    deduped: number
    completed: number
    failed: number
    aborted: number
    cancelledBeforeStart: number
    ttlSkipped: number
  } {
    return {
      queued: this.routingUpdateQueue?.queued ?? 0,
      running: this.routingUpdateQueue?.running ?? 0,
      total: this.routingUpdateQueue?.size ?? 0,
      ...this.routingUpdateStats
    }
  }

  isStarted (): boolean {
    return this.running
  }

  queueRoutingTableUpdate (peerId: PeerId, options: AbortOptions = {}): void {
    const queue = this.routingUpdateQueue

    if (queue == null) {
      return
    }

    const peerIdStr = peerId.toString()
    const now = Date.now()

    this.pruneRoutingUpdateRecent(now)

    const updateAllowedAt = this.routingUpdateRecent.get(peerIdStr)
    if (updateAllowedAt != null && updateAllowedAt > now) {
      this.routingUpdateStats.ttlSkipped++
      return
    }

    if (this.routingUpdateInFlight.has(peerIdStr)) {
      this.routingUpdateStats.deduped++
      return
    }

    this.routingUpdateInFlight.add(peerIdStr)
    this.routingUpdateRecent.set(peerIdStr, now + this.routingUpdatePeerTtl)
    this.routingUpdateStats.enqueued++

    void queue.add(async () => {
      const signal = options.signal == null
        ? this.shutDownController.signal
        : anySignal([this.shutDownController.signal, options.signal])

      setMaxListeners(Infinity, signal)

      try {
        await this.routingTable.add(peerId, {
          signal
        })
        this.routingUpdateStats.completed++
      } catch (err: any) {
        if (signal.aborted || err?.name === 'AbortError') {
          this.routingUpdateStats.aborted++
          return
        }

        this.routingUpdateStats.failed++
        throw err
      } finally {
        this.routingUpdateInFlight.delete(peerIdStr)

        if (options.signal != null && 'clear' in signal) {
          (signal as any).clear()
        }
      }
    }).catch(err => {
      this.routingUpdateInFlight.delete(peerIdStr)
      this.logger.forComponent(`${this.logPrefix}:routing-update`).error('could not update routing table for peer %p - %e', peerId, err)
    })
  }

  private pruneRoutingUpdateRecent (now: number): void {
    if (this.routingUpdateRecent.size < 4096) {
      return
    }

    for (const [peerId, expiresAt] of this.routingUpdateRecent.entries()) {
      if (expiresAt <= now) {
        this.routingUpdateRecent.delete(peerId)
      }
    }
  }

  /**
   * Starts the query manager
   */
  async start (): Promise<void> {
    if (this.running) {
      return
    }

    this.running = true

    // allow us to stop queries on shut down
    this.shutDownController = new AbortController()
    // make sure we don't make a lot of noise in the logs
    setMaxListeners(Infinity, this.shutDownController.signal)

    this.routingUpdateQueue = new Queue<void>({
      concurrency: this.routingUpdateQueueConcurrency
    })
  }

  /**
   * Stops all queries
   */
  async stop (): Promise<void> {
    this.running = false

    if (this.routingUpdateQueue != null) {
      this.routingUpdateStats.cancelledBeforeStart += this.routingUpdateQueue.queued
      this.routingUpdateQueue.abort()
      this.routingUpdateQueue = undefined
    }
    this.routingUpdateInFlight.clear()

    this.shutDownController.abort()
  }

  async * run (key: Uint8Array, queryFunc: QueryFunc, options: QueryOptions = {}): AsyncGenerator<QueryEvent> {
    if (!this.running) {
      throw new Error('QueryManager not started')
    }

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
    let queryFinished = false
    try {
      if (this.routingTable.size === 0 && !this.allowQueryWithZeroPeers) {
        log('routing table was empty, waiting for some peers before running%s query', options.isSelfQuery === true ? ' self' : '')
        // wait to discover at least one DHT peer that isn't us
        await pEvent(this.routingTable, 'peer:add', {
          signal,
          filter: (event) => !this.peerId.equals(event.detail)
        })
        log('routing table has peers, continuing with%s query', options.isSelfQuery === true ? ' self' : '')
      }

      if (options.isSelfQuery !== true && this.initialQuerySelfHasRun != null) {
        log('waiting for initial self query before continuing')

        await raceSignal(this.initialQuerySelfHasRun.promise, signal)

        this.initialQuerySelfHasRun = undefined
      }

      log('query:start')

      const id = await convertBuffer(key, {
        signal
      })
      const peers = this.routingTable.closestPeers(id, {
        count: this.routingTable.kBucketSize
      })

      // split peers into d buckets evenly(ish)
      const peersToQuery = peers.sort(() => {
        if (Math.random() > 0.5) {
          return 1
        }

        return -1
      })
        .reduce((acc: PeerId[][], curr, index) => {
          acc[index % this.disjointPaths].push(curr)

          return acc
        }, new Array(this.disjointPaths).fill(0).map(() => []))
        .filter(peers => peers.length > 0)

      if (peers.length === 0) {
        log.error('running query with no peers')
        return
      }

      // make sure we don't get trapped in a loop
      const peersSeen = createScalableCuckooFilter(1024)

      // Create query paths from the starting peers
      const paths = peersToQuery.map((peer, index) => {
        return queryPath({
          ...options,
          key,
          startingPeers: peer,
          ourPeerId: this.peerId,
          signal,
          query: queryFunc,
          path: index,
          numPaths: peersToQuery.length,
          alpha: this.alpha,
          log,
          peersSeen,
          onProgress: options.onProgress,
          connectionManager: this.connectionManager
        })
      })

      // Execute the query along each disjoint path and yield their results as they become available
      for await (const event of merge(...paths)) {
        if (event.name === 'QUERY_ERROR') {
          log.error('query error - %e', event.error)
        }

        signal.throwIfAborted()
        yield event

        if (event.name === 'PEER_RESPONSE') {
          this.queueRoutingTableUpdate(event.from)
        }
      }

      queryFinished = true
    } catch (err) {
      if (this.running) {
        // ignore errors thrown during shut down
        throw err
      }
    } finally {
      if (!queryFinished) {
        log('query exited early')
        queryEarlyExitController.abort()
      }

      signal.clear()

      log('query finished')
    }
  }
}
