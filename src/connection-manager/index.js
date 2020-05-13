'use strict'

const errcode = require('err-code')
const mergeOptions = require('merge-options')
const LatencyMonitor = require('./latency-monitor')
const debug = require('debug')('libp2p:connection-manager')
const retimer = require('retimer')

const { EventEmitter } = require('events')

const PeerId = require('peer-id')

const {
  ERR_INVALID_PARAMETERS
} = require('../errors')

const defaultOptions = {
  maxConnections: Infinity,
  minConnections: 0,
  maxData: Infinity,
  maxSentData: Infinity,
  maxReceivedData: Infinity,
  maxEventLoopDelay: Infinity,
  pollInterval: 2000,
  movingAverageInterval: 60000,
  defaultPeerValue: 1
}

/**
 * Responsible for managing known connections.
 * @fires ConnectionManager#peer:connect Emitted when a new peer is connected.
 * @fires ConnectionManager#peer:disconnect Emitted when a peer is disconnected.
 */
class ConnectionManager extends EventEmitter {
  /**
   * @constructor
   * @param {Libp2p} libp2p
   * @param {object} options
   * @param {Number} options.maxConnections The maximum number of connections allowed. Default=Infinity
   * @param {Number} options.minConnections The minimum number of connections to avoid pruning. Default=0
   * @param {Number} options.maxData The max data (in and out), per average interval to allow. Default=Infinity
   * @param {Number} options.maxSentData The max outgoing data, per average interval to allow. Default=Infinity
   * @param {Number} options.maxReceivedData The max incoming data, per average interval to allow.. Default=Infinity
   * @param {Number} options.maxEventLoopDelay The upper limit the event loop can take to run. Default=Infinity
   * @param {Number} options.pollInterval How often, in milliseconds, metrics and latency should be checked. Default=2000
   * @param {Number} options.movingAverageInterval How often, in milliseconds, to compute averages. Default=60000
   * @param {Number} options.defaultPeerValue The value of the peer. Default=1
   */
  constructor (libp2p, options) {
    super()

    this._libp2p = libp2p
    this._peerId = libp2p.peerId.toB58String()

    this._options = mergeOptions.call({ ignoreUndefined: true }, defaultOptions, options)
    if (this._options.maxConnections < this._options.minConnections) {
      throw errcode(new Error('Connection Manager maxConnections must be greater than minConnections'), ERR_INVALID_PARAMETERS)
    }

    debug('options: %j', this._options)

    this._libp2p = libp2p

    /**
     * Map of peer identifiers to their peer value for pruning connections.
     * @type {Map<string, number>}
     */
    this._peerValues = new Map()

    /**
     * Map of connections per peer
     * @type {Map<string, Array<conn>>}
     */
    this.connections = new Map()

    this._timer = null
    this._checkMetrics = this._checkMetrics.bind(this)
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
    this._latencyMonitor = new LatencyMonitor({
      latencyCheckIntervalMs: this._options.pollInterval,
      dataEmitIntervalMs: this._options.pollInterval
    })
    this._onLatencyMeasure = this._onLatencyMeasure.bind(this)
    this._latencyMonitor.on('data', this._onLatencyMeasure)
    debug('started')
  }

  /**
   * Stops the Connection Manager
   * @async
   */
  async stop () {
    this._timer && this._timer.clear()
    this._latencyMonitor && this._latencyMonitor.removeListener('data', this._onLatencyMeasure)

    await this._close()
    debug('stopped')
  }

  /**
   * Cleans up the connections
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

    await tasks
    this.connections.clear()
  }

  /**
   * Sets the value of the given peer. Peers with lower values
   * will be disconnected first.
   * @param {PeerId} peerId
   * @param {number} value A number between 0 and 1
   */
  setPeerValue (peerId, value) {
    if (value < 0 || value > 1) {
      throw new Error('value should be a number between 0 and 1')
    }
    if (peerId.toB58String) {
      peerId = peerId.toB58String()
    }
    this._peerValues.set(peerId, value)
  }

  /**
   * Checks the libp2p metrics to determine if any values have exceeded
   * the configured maximums.
   * @private
   */
  _checkMetrics () {
    const movingAverages = this._libp2p.metrics.global.movingAverages
    const received = movingAverages.dataReceived[this._options.movingAverageInterval].movingAverage()
    this._checkLimit('maxReceivedData', received)
    const sent = movingAverages.dataSent[this._options.movingAverageInterval].movingAverage()
    this._checkLimit('maxSentData', sent)
    const total = received + sent
    this._checkLimit('maxData', total)
    debug('metrics update', total)
    this._timer.reschedule(this._options.pollInterval)
  }

  /**
   * Tracks the incoming connection and check the connection limit
   * @param {Connection} connection
   */
  onConnect (connection) {
    const peerId = connection.remotePeer
    const peerIdStr = peerId.toB58String()
    const storedConn = this.connections.get(peerIdStr)

    if (storedConn) {
      storedConn.push(connection)
    } else {
      this.connections.set(peerIdStr, [connection])
      this.emit('peer:connect', connection)
    }

    this._libp2p.peerStore.keyBook.set(peerId, peerId.pubKey)

    if (!this._peerValues.has(peerIdStr)) {
      this._peerValues.set(peerIdStr, this._options.defaultPeerValue)
    }

    this._checkLimit('maxConnections', this.size)
  }

  /**
   * Removes the connection from tracking
   * @param {Connection} connection
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
   * @param {PeerId} peerId
   * @returns {Connection}
   */
  get (peerId) {
    if (!PeerId.isPeerId(peerId)) {
      throw errcode(new Error('peerId must be an instance of peer-id'), ERR_INVALID_PARAMETERS)
    }

    const id = peerId.toB58String()
    const connections = this.connections.get(id)

    // Return the first, open connection
    if (connections) {
      return connections.find(connection => connection.stat.status === 'open')
    }
    return null
  }

  /**
   * If the event loop is slow, maybe close a connection
   * @private
   * @param {*} summary The LatencyMonitor summary
   */
  _onLatencyMeasure (summary) {
    this._checkLimit('maxEventLoopDelay', summary.avgMs)
  }

  /**
   * If the `value` of `name` has exceeded its limit, maybe close a connection
   * @private
   * @param {string} name The name of the field to check limits for
   * @param {number} value The current value of the field
   */
  _checkLimit (name, value) {
    const limit = this._options[name]
    debug('checking limit of %s. current value: %d of %d', name, value, limit)
    if (value > limit) {
      debug('%s: limit exceeded: %s, %d', this._peerId, name, value)
      this._maybeDisconnectOne()
    }
  }

  /**
   * If we have more connections than our maximum, close a connection
   * to the lowest valued peer.
   * @private
   */
  _maybeDisconnectOne () {
    if (this._options.minConnections < this.connections.size) {
      const peerValues = Array.from(this._peerValues).sort(byPeerValue)
      debug('%s: sorted peer values: %j', this._peerId, peerValues)
      const disconnectPeer = peerValues[0]
      if (disconnectPeer) {
        const peerId = disconnectPeer[0]
        debug('%s: lowest value peer is %s', this._peerId, peerId)
        debug('%s: closing a connection to %j', this._peerId, peerId)
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

function byPeerValue (peerValueEntryA, peerValueEntryB) {
  return peerValueEntryA[1] - peerValueEntryB[1]
}
