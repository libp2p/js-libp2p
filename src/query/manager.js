'use strict'

const { AbortController } = require('native-abort-controller')
const { TimeoutController } = require('timeout-abort-controller')
const { anySignal } = require('any-signal')
const {
  ALPHA, K, DEFAULT_QUERY_TIMEOUT
} = require('../constants')
const { toString: uint8ArrayToString } = require('uint8arrays/to-string')
const { logger } = require('../utils')
const { queryPath } = require('./query-path')
const merge = require('it-merge')
const {
  EventEmitter,
  // @ts-expect-error only available in node 15+
  setMaxListeners
} = require('events')

/**
 * @typedef {import('peer-id')} PeerId
 * @typedef {import('../types').Metrics} Metrics
 */

const METRIC_RUNNING_QUERIES = 'running-queries'

/**
 * Keeps track of all running queries
 */
class QueryManager {
  /**
   * Creates a new QueryManager
   *
   * @param {object} params
   * @param {PeerId} params.peerId
   * @param {boolean} params.lan
   * @param {Metrics} [params.metrics]
   * @param {number} [params.disjointPaths]
   * @param {number} [params.alpha]
   */
  constructor ({ peerId, lan, metrics, disjointPaths = K, alpha = ALPHA }) {
    this._peerId = peerId
    this._disjointPaths = disjointPaths || K
    this._controllers = new Set()
    this._running = false
    this._alpha = alpha || ALPHA
    this._lan = lan
    this._metrics = metrics
    this._queries = 0
  }

  /**
   * Starts the query manager
   */
  start () {
    this._running = true
  }

  /**
   * Stops all queries
   */
  stop () {
    this._running = false

    for (const controller of this._controllers) {
      controller.abort()
    }

    this._controllers.clear()
  }

  /**
   * @template T
   *
   * @param {Uint8Array} key
   * @param {PeerId[]} peers
   * @param {import('./types').QueryFunc} queryFunc
   * @param {object} [options]
   * @param {AbortSignal} [options.signal]
   * @param {number} [options.queryFuncTimeout]
   *
   * @returns {AsyncIterable<import('../types').QueryEvent>}
   */
  async * run (key, peers, queryFunc, options = {}) {
    if (!this._running) {
      throw new Error('QueryManager not started')
    }

    let timeoutController

    if (!options.signal) {
      // don't let queries run forever
      timeoutController = new TimeoutController(DEFAULT_QUERY_TIMEOUT)
      options.signal = timeoutController.signal
    }

    // allow us to stop queries on shut down
    const abortController = new AbortController()
    this._controllers.add(abortController)
    const signals = [abortController.signal]
    options.signal && signals.push(options.signal)
    const signal = anySignal(signals)

    // this signal will get listened to for every invocation of queryFunc
    // so make sure we don't make a lot of noise in the logs
    try {
      setMaxListeners && setMaxListeners(0, signal)
    } catch {} // fails on node < 15.4

    const log = logger(`libp2p:kad-dht:${this._lan ? 'lan' : 'wan'}:query:` + uint8ArrayToString(key, 'base58btc'))

    // query a subset of peers up to `kBucketSize / 2` in length
    const peersToQuery = peers.slice(0, Math.min(this._disjointPaths, peers.length))
    const startTime = Date.now()
    const cleanUp = new EventEmitter()

    try {
      log('query:start')
      this._queries++
      this._metrics && this._metrics.updateComponentMetric(`kad-dht-${this._lan ? 'lan' : 'wan'}`, METRIC_RUNNING_QUERIES, this._queries)

      if (peers.length === 0) {
        log.error('Running query with no peers')
        return
      }

      // Create query paths from the starting peers
      const paths = peersToQuery.map((peer, index) => {
        return queryPath({
          key,
          startingPeer: peer,
          ourPeerId: this._peerId,
          signal,
          query: queryFunc,
          pathIndex: index,
          numPaths: peersToQuery.length,
          alpha: this._alpha,
          cleanUp,
          queryFuncTimeout: options.queryFuncTimeout,
          log
        })
      })

      // Execute the query along each disjoint path and yield their results as they become available
      for await (const event of merge(...paths)) {
        yield event

        if (event.name === 'QUERY_ERROR' && event.error) {
          log('error', event.error)
        }
      }
    } catch (/** @type {any} */ err) {
      if (!this._running && err.code === 'ERR_QUERY_ABORTED') {
        // ignore query aborted errors that were thrown during query manager shutdown
      } else {
        throw err
      }
    } finally {
      this._controllers.delete(abortController)

      if (timeoutController) {
        timeoutController.clear()
      }

      this._queries--
      this._metrics && this._metrics.updateComponentMetric(`kad-dht-${this._lan ? 'lan' : 'wan'}`, METRIC_RUNNING_QUERIES, this._queries)

      cleanUp.emit('cleanup')
      log(`query:done in ${Date.now() - (startTime || 0)}ms`)
    }
  }
}

module.exports.QueryManager = QueryManager
