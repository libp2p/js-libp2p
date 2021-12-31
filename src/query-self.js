'use strict'

const { EventEmitter } = require('events')
const take = require('it-take')
const length = require('it-length')
const { QUERY_SELF_INTERVAL, QUERY_SELF_TIMEOUT, K } = require('./constants')
const utils = require('./utils')
const { TimeoutController } = require('timeout-abort-controller')
const { anySignal } = require('any-signal')
// @ts-expect-error setMaxListeners is missing from the types
const { setMaxListeners } = require('events')

/**
 * Receives notifications of new peers joining the network that support the DHT protocol
 */
class QuerySelf extends EventEmitter {
  /**
   * Create a new network
   *
   * @param {object} params
   * @param {import('peer-id')} params.peerId
   * @param {import('./peer-routing').PeerRouting} params.peerRouting
   * @param {number} [params.count] - how many peers to find
   * @param {number} [params.interval] - how often to find them
   * @param {number} [params.queryTimeout] - how long to let queries run
   * @param {boolean} params.lan
   */
  constructor ({ peerId, peerRouting, lan, count = K, interval = QUERY_SELF_INTERVAL, queryTimeout = QUERY_SELF_TIMEOUT }) {
    super()

    this._log = utils.logger(`libp2p:kad-dht:${lan ? 'lan' : 'wan'}:query-self`)
    this._running = false
    this._peerId = peerId
    this._peerRouting = peerRouting
    this._count = count || K
    this._interval = interval || QUERY_SELF_INTERVAL
    this._queryTimeout = queryTimeout || QUERY_SELF_TIMEOUT
  }

  /**
   * Start the network
   */
  start () {
    if (this._running) {
      return
    }

    this._running = true
    this._querySelf()
  }

  /**
   * Stop all network activity
   */
  stop () {
    this._running = false

    if (this._timeoutId) {
      clearTimeout(this._timeoutId)
    }

    if (this._controller) {
      this._controller.abort()
    }
  }

  async _querySelf () {
    const timeoutController = new TimeoutController(this._queryTimeout)

    try {
      this._controller = new AbortController()
      const signal = anySignal([this._controller.signal, timeoutController.signal])
      // this controller will get used for lots of dial attempts so make sure we don't cause warnings to be logged
      try {
        setMaxListeners && setMaxListeners(Infinity, signal)
      } catch {} // fails on node < 15.4
      const found = await length(await take(this._peerRouting.getClosestPeers(this._peerId.toBytes(), {
        signal
      }), this._count))

      this._log('query ran successfully - found %d peers', found)
    } catch (/** @type {any} */ err) {
      this._log('query error', err)
    } finally {
      this._timeoutId = setTimeout(this._querySelf.bind(this), this._interval)
      timeoutController.clear()
    }
  }
}

module.exports.QuerySelf = QuerySelf
