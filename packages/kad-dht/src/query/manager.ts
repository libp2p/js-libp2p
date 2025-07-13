import { createScalableCuckooFilter } from '@libp2p/utils/filters'
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
import type { ComponentLogger, Metrics, PeerId, RoutingOptions, Startable } from '@libp2p/interface'
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
  private readonly peerId: PeerId
  private readonly routingTable: RoutingTable
  private readonly disjointPaths: number
  private readonly alpha: number
  private readonly log: Logger
  private readonly initialQuerySelfHasRun?: Deferred<any>
  private readonly allowQueryWithZeroPeers: boolean
  private readonly connectionManager: ConnectionManager
  private readonly metrics: MetricsRegistry | undefined
  private running: boolean
  private readonly peerScores: Map<string, number>
  private readonly MAX_SCORE = 100
  private readonly MIN_SCORE = 0
  private readonly SCORE_DECAY = 0.95 // Score decay factor
  private readonly SUCCESS_SCORE = 10
  private readonly FAILURE_PENALTY = -5

  constructor (components: QueryManagerComponents, init: QueryManagerInit) {
    this.logPrefix = init.logPrefix
    this.disjointPaths = init.disjointPaths ?? K
    this.alpha = init.alpha ?? ALPHA
    this.initialQuerySelfHasRun = init.initialQuerySelfHasRun
    this.routingTable = init.routingTable
    this.logger = components.logger
    this.peerId = components.peerId
    this.connectionManager = components.connectionManager
    this.allowQueryWithZeroPeers = init.allowQueryWithZeroPeers ?? false

    // allow us to stop queries on shut down
    this.shutDownController = new AbortController()
    // make sure we don't make a lot of noise in the logs
    setMaxListeners(Infinity, this.shutDownController.signal)

    this.running = false
    
    this.peerScores = new Map()
    
    // Decay scores periodically
    setInterval(() => {
      for (const [peerId, score] of this.peerScores) {
        const newScore = score * this.SCORE_DECAY
        if (newScore < 1) {
          this.peerScores.delete(peerId)
        } else {
          this.peerScores.set(peerId, newScore)
        }
      }
    }, 300000) // Every 5 minutes
  }

  isStarted (): boolean {
    return this.running
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
  }

  /**
   * Stops all queries
   */
  async stop (): Promise<void> {
    this.running = false

    this.shutDownController.abort()
  }

  /**
   * Update peer score based on query success/failure
   */
  private updatePeerScore (peerId: string, success: boolean): void {
    const currentScore = this.peerScores.get(peerId) ?? this.MIN_SCORE
    let newScore = currentScore + (success ? this.SUCCESS_SCORE : this.FAILURE_PENALTY)
    newScore = Math.min(Math.max(newScore, this.MIN_SCORE), this.MAX_SCORE)
    this.peerScores.set(peerId, newScore)
  }

  /**
   * Get weighted random peer selection based on scores
   */
  private selectPeersWithScores (peers: PeerId[], count: number): PeerId[] {
    // Calculate weights based on scores
    const weights = peers.map(peer => {
      const score = this.peerScores.get(peer.toString()) ?? this.MIN_SCORE
      return Math.exp(score / this.MAX_SCORE) // Exponential weighting
    })
    
    const selected: PeerId[] = []
    const totalWeight = weights.reduce((a, b) => a + b, 0)
    
    while (selected.length < count && peers.length > 0) {
      let random = Math.random() * totalWeight
      let index = 0
      
      // Select peer based on weighted probability
      while (random > 0 && index < weights.length) {
        random -= weights[index]
        index++
      }
      index = Math.min(index - 1, weights.length - 1)
      
      selected.push(peers[index])
      peers.splice(index, 1)
      weights.splice(index, 1)
    }
    
    return selected
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
      const allPeers = this.routingTable.closestPeers(id, {
        count: this.routingTable.kBucketSize
      })

      // Use score-based peer selection
      const peersToQuery = this.selectPeersWithScores(allPeers, this.disjointPaths * this.alpha)
        .reduce((acc: PeerId[][], curr, index) => {
          acc[index % this.disjointPaths].push(curr)
          return acc
        }, new Array(this.disjointPaths).fill(0).map(() => []))
        .filter(peers => peers.length > 0)

      if (peersToQuery.length === 0) {
        log.error('no peers available for query')
        return
      }

      // make sure we don't get trapped in a loop
      const peersSeen = createScalableCuckooFilter(1024)
      const queryStartTime = Date.now()

      // Execute parallel queries with monitoring
      const paths = peersToQuery.map((peers, index) => {
        return queryPath({
          ...options,
          key,
          startingPeers: peers,
          ourPeerId: this.peerId,
          signal,
          query: async function * (opts) {
            const startTime = Date.now()
            let success = false
            
            try {
              for await (const event of queryFunc(opts)) {
                success = event.name === 'PEER_RESPONSE'
                yield event
              }
            } finally {
              // Update peer scores based on query success
              if (opts.peer != null) {
                this.updatePeerScore(opts.peer.id.toString(), success)
              }
              
              // Track query metrics
              const duration = Date.now() - startTime
              this.metrics?.histogram('libp2p_kad_dht_query_time', duration)
              if (!success) {
                this.metrics?.increment('libp2p_kad_dht_query_errors')
              }
            }
          }.bind(this),
          path: index,
          numPaths: peersToQuery.length,
          alpha: this.alpha,
          log,
          peersSeen,
          onProgress: options.onProgress,
          connectionManager: this.connectionManager
        })
      })

      // Process query results
      for await (const event of merge(...paths)) {
        if (event.name === 'QUERY_ERROR') {
          log.error('query error', event.error)
          this.metrics?.increment('libp2p_kad_dht_query_errors')
        }

        if (event.name === 'PEER_RESPONSE') {
          // Add new peers to routing table
          for (const peer of [...event.closer, ...event.providers]) {
            if (await this.connectionManager.isDialable(peer.multiaddrs, { signal })) {
              await this.routingTable.add(peer.id, { signal })
            }
          }
        }

        signal.throwIfAborted()
        yield event
      }

      queryFinished = true
      const queryDuration = Date.now() - queryStartTime
      this.metrics?.histogram('libp2p_kad_dht_query_total_time', queryDuration)
      
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
