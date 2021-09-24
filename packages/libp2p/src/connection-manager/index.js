'use strict'

const debug = require('debug')
const log = Object.assign(debug('libp2p:connection-manager'), {
  error: debug('libp2p:connection-manager:err')
})

const errcode = require('err-code')
const mergeOptions = require('merge-options')
const LatencyMonitor = require('./latency-monitor')
// @ts-ignore retimer does not have types
const retimer = require('retimer')

const { EventEmitter } = require('events')

const PeerId = require('peer-id')

const {
  codes: { ERR_INVALID_PARAMETERS }
} = require('../errors')

const defaultOptions = {
  maxConnections: Infinity,
  minConnections: 0,
  maxData: Infinity,
  maxSentData: Infinity,
  maxReceivedData: Infinity,
  maxEventLoopDelay: Infinity,
  pollInterval: 2000,
  autoDialInterval: 10000,
  movingAverageInterval: 60000,
  defaultPeerValue: 1
}

/**
 * @typedef {import('../')} Libp2p
 * @typedef {import('libp2p-interfaces/src/connection').Connection} Connection
 */

/**
 * @typedef {Object} ConnectionManagerOptions
 * @property {number} [maxConnections = Infinity] - The maximum number of connections allowed.
 * @property {number} [minConnections = 0] - The minimum number of connections to avoid pruning.
 * @property {number} [maxData = Infinity] - The max data (in and out), per average interval to allow.
 * @property {number} [maxSentData = Infinity] - The max outgoing data, per average interval to allow.
 * @property {number} [maxReceivedData = Infinity] - The max incoming data, per average interval to allow.
 * @property {number} [maxEventLoopDelay = Infinity] - The upper limit the event loop can take to run.
 * @property {number} [pollInterval = 2000] - How often, in milliseconds, metrics and latency should be checked.
 * @property {number} [movingAverageInterval = 60000] - How often, in milliseconds, to compute averages.
 * @property {number} [defaultPeerValue = 1] - The value of the peer.
 * @property {boolean} [autoDial = true] - Should preemptively guarantee connections are above the low watermark.
 * @property {number} [autoDialInterval = 10000] - How often, in milliseconds, it should preemptively guarantee connections are above the low watermark.
 */

/**
 *
 * @fires ConnectionManager#peer:connect Emitted when a new peer is connected.
 * @fires ConnectionManager#peer:disconnect Emitted when a peer is disconnected.
 */
class ConnectionManager extends EventEmitter {
  /**
   * Responsible for managing known connections.
   *
   * @class
   * @param {Libp2p} libp2p
   * @param {ConnectionManagerOptions} options
   */
  constructor (libp2p, options = {}) {
    super()

    this._libp2p = libp2p
    this._peerId = libp2p.peerId.toB58String()

    this._options = mergeOptions.call({ ignoreUndefined: true }, defaultOptions, options)
    if (this._options.maxConnections < this._options.minConnections) {
      throw errcode(new Error('Connection Manager maxConnections must be greater than minConnections'), ERR_INVALID_PARAMETERS)
    }

    log('options: %j', this._options)

    /**
     * Map of peer identifiers to their peer value for pruning connections.
     *
     * @type {Map<string, number>}
     */
    this._peerValues = new Map()

    /**
     * Map of connections per peer
     *
     * @type {Map<string, Connection[]>}
     */
    this.connections = new Map()

    this._started = false
    this._timer = null
    this._autoDialTimeout = null
    this._checkMetrics = this._checkMetrics.bind(this)
    this._autoDial = this._autoDial.bind(this)

    this._latencyMonitor = new LatencyMonitor({
      latencyCheckIntervalMs: this._options.pollInterval,
      dataEmitIntervalMs: this._options.pollInterval
    })
  }

  /**
   * Get current number of open connections.
   */
  get size () {
    return Array.from(this.connections.values())
      .reduce((accumulator, value) => accumulator + value.length, 0)
  }

  /**
   * Starts the Connection Manager. If Metrics are not enabled on libp2p
   * only event loop and connection limits will be monitored.
   */
  start () {
    if (this._libp2p.metrics) {
      this._timer = this._timer || retimer(this._checkMetrics, this._options.pollInterval)
    }

    // latency monitor
    this._latencyMonitor.start()
    this._onLatencyMeasure = this._onLatencyMeasure.bind(this)
    this._latencyMonitor.on('data', this._onLatencyMeasure)

    this._started = true
    log('started')

    this._options.autoDial && this._autoDial()
  }

  /**
   * Stops the Connection Manager
   *
   * @async
   */
  async stop () {
    this._autoDialTimeout && this._autoDialTimeout.clear()
    this._timer && this._timer.clear()

    this._latencyMonitor.removeListener('data', this._onLatencyMeasure)
    this._latencyMonitor.stop()

    this._started = false
    await this._close()
    log('stopped')
  }

  /**
   * Cleans up the connections
   *
   * @async
   */
  async _close () {
    // Close all connections we're tracking
    const tasks = []
    for (const connectionList of this.connections.values()) {
      for (const connection of connectionList) {
        tasks.push(connection.close())
      }
    }

    await Promise.all(tasks)
    this.connections.clear()
  }

  /**
   * Sets the value of the given peer. Peers with lower values
   * will be disconnected first.
   *
   * @param {PeerId} peerId
   * @param {number} value - A number between 0 and 1
   * @returns {void}
   */
  setPeerValue (peerId, value) {
    if (value < 0 || value > 1) {
      throw new Error('value should be a number between 0 and 1')
    }
    this._peerValues.set(peerId.toB58String(), value)
  }

  /**
   * Checks the libp2p metrics to determine if any values have exceeded
   * the configured maximums.
   *
   * @private
   */
  _checkMetrics () {
    if (this._libp2p.metrics) {
      const movingAverages = this._libp2p.metrics.global.movingAverages
      // @ts-ignore moving averages object types
      const received = movingAverages.dataReceived[this._options.movingAverageInterval].movingAverage()
      this._checkMaxLimit('maxReceivedData', received)
      // @ts-ignore moving averages object types
      const sent = movingAverages.dataSent[this._options.movingAverageInterval].movingAverage()
      this._checkMaxLimit('maxSentData', sent)
      const total = received + sent
      this._checkMaxLimit('maxData', total)
      log('metrics update', total)
      this._timer = retimer(this._checkMetrics, this._options.pollInterval)
    }
  }

  /**
   * Tracks the incoming connection and check the connection limit
   *
   * @param {Connection} connection
   * @returns {void}
   */
  onConnect (connection) {
    const peerId = connection.remotePeer
    const peerIdStr = peerId.toB58String()
    const storedConn = this.connections.get(peerIdStr)

    this.emit('peer:connect', connection)
    if (storedConn) {
      storedConn.push(connection)
    } else {
      this.connections.set(peerIdStr, [connection])
    }

    this._libp2p.peerStore.keyBook.set(peerId, peerId.pubKey)

    if (!this._peerValues.has(peerIdStr)) {
      this._peerValues.set(peerIdStr, this._options.defaultPeerValue)
    }

    this._checkMaxLimit('maxConnections', this.size)
  }

  /**
   * Removes the connection from tracking
   *
   * @param {Connection} connection
   * @returns {void}
   */
  onDisconnect (connection) {
    const peerId = connection.remotePeer.toB58String()
    let storedConn = this.connections.get(peerId)

    if (storedConn && storedConn.length > 1) {
      storedConn = storedConn.filter((conn) => conn.id !== connection.id)
      this.connections.set(peerId, storedConn)
    } else if (storedConn) {
      this.connections.delete(peerId)
      this._peerValues.delete(connection.remotePeer.toB58String())
      this.emit('peer:disconnect', connection)
    }
  }

  /**
   * Get a connection with a peer.
   *
   * @param {PeerId} peerId
   * @returns {Connection|null}
   */
  get (peerId) {
    const connections = this.getAll(peerId)
    if (connections.length) {
      return connections[0]
    }
    return null
  }

  /**
   * Get all open connections with a peer.
   *
   * @param {PeerId} peerId
   * @returns {Connection[]}
   */
  getAll (peerId) {
    if (!PeerId.isPeerId(peerId)) {
      throw errcode(new Error('peerId must be an instance of peer-id'), ERR_INVALID_PARAMETERS)
    }

    const id = peerId.toB58String()
    const connections = this.connections.get(id)

    // Return all open connections
    if (connections) {
      return connections.filter(connection => connection.stat.status === 'open')
    }
    return []
  }

  /**
   * If the event loop is slow, maybe close a connection
   *
   * @private
   * @param {*} summary - The LatencyMonitor summary
   */
  _onLatencyMeasure (summary) {
    this._checkMaxLimit('maxEventLoopDelay', summary.avgMs)
  }

  /**
   * If the `value` of `name` has exceeded its limit, maybe close a connection
   *
   * @private
   * @param {string} name - The name of the field to check limits for
   * @param {number} value - The current value of the field
   */
  _checkMaxLimit (name, value) {
    const limit = this._options[name]
    log('checking limit of %s. current value: %d of %d', name, value, limit)
    if (value > limit) {
      log('%s: limit exceeded: %s, %d', this._peerId, name, value)
      this._maybeDisconnectOne()
    }
  }

  /**
   * Proactively tries to connect to known peers stored in the PeerStore.
   * It will keep the number of connections below the upper limit and sort
   * the peers to connect based on wether we know their keys and protocols.
   *
   * @async
   * @private
   */
  async _autoDial () {
    const minConnections = this._options.minConnections

    // Already has enough connections
    if (this.size >= minConnections) {
      this._autoDialTimeout = retimer(this._autoDial, this._options.autoDialInterval)
      return
    }

    // Sort peers on wether we know protocols of public keys for them
    const peers = Array.from(this._libp2p.peerStore.peers.values())
      .sort((a, b) => {
        if (b.protocols && b.protocols.length && (!a.protocols || !a.protocols.length)) {
          return 1
        } else if (b.id.pubKey && !a.id.pubKey) {
          return 1
        }
        return -1
      })

    for (let i = 0; i < peers.length && this.size < minConnections; i++) {
      if (!this.get(peers[i].id)) {
        log('connecting to a peerStore stored peer %s', peers[i].id.toB58String())
        try {
          await this._libp2p.dialer.connectToPeer(peers[i].id)

          // Connection Manager was stopped
          if (!this._started) {
            return
          }
        } catch (err) {
          log.error('could not connect to peerStore stored peer', err)
        }
      }
    }

    this._autoDialTimeout = retimer(this._autoDial, this._options.autoDialInterval)
  }

  /**
   * If we have more connections than our maximum, close a connection
   * to the lowest valued peer.
   *
   * @private
   */
  _maybeDisconnectOne () {
    if (this._options.minConnections < this.connections.size) {
      const peerValues = Array.from(new Map([...this._peerValues.entries()].sort((a, b) => a[1] - b[1])))
      log('%s: sorted peer values: %j', this._peerId, peerValues)
      const disconnectPeer = peerValues[0]
      if (disconnectPeer) {
        const peerId = disconnectPeer[0]
        log('%s: lowest value peer is %s', this._peerId, peerId)
        log('%s: closing a connection to %j', this._peerId, peerId)
        for (const connections of this.connections.values()) {
          if (connections[0].remotePeer.toB58String() === peerId) {
            connections[0].close()
            break
          }
        }
      }
    }
  }
}

module.exports = ConnectionManager
