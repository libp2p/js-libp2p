'use strict'

const errcode = require('err-code')
const mergeOptions = require('merge-options')
const LatencyMonitor = require('./latency-monitor')
const debug = require('debug')('libp2p:connection-manager')
const retimer = require('retimer')

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

class ConnectionManager {
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
    this._libp2p = libp2p
    this._registrar = libp2p.registrar
    this._peerId = libp2p.peerInfo.id.toB58String()
    this._options = mergeOptions.call({ ignoreUndefined: true }, defaultOptions, options)
    if (this._options.maxConnections < this._options.minConnections) {
      throw errcode(new Error('Connection Manager maxConnections must be greater than minConnections'), ERR_INVALID_PARAMETERS)
    }

    debug('options: %j', this._options)

    this._metrics = libp2p.metrics

    this._peerValues = new Map()
    this._connections = new Map()
    this._timer = null
    this._checkMetrics = this._checkMetrics.bind(this)
  }

  /**
   * Starts the Connection Manager. If Metrics are not enabled on libp2p
   * only event loop and connection limits will be monitored.
   */
  start () {
    if (this._metrics) {
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
   */
  stop () {
    this._timer && this._timer.clear()
    this._latencyMonitor && this._latencyMonitor.removeListener('data', this._onLatencyMeasure)
    debug('stopped')
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
    const movingAverages = this._metrics.global.movingAverages
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
    const peerId = connection.remotePeer.toB58String()
    this._connections.set(connection.id, connection)
    if (!this._peerValues.has(peerId)) {
      this._peerValues.set(peerId, this._options.defaultPeerValue)
    }
    this._checkLimit('maxConnections', this._connections.size)
  }

  /**
   * Removes the connection from tracking
   * @param {Connection} connection
   */
  onDisconnect (connection) {
    this._connections.delete(connection.id)
    this._peerValues.delete(connection.remotePeer.toB58String())
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
    if (this._options.minConnections < this._connections.size) {
      const peerValues = Array.from(this._peerValues).sort(byPeerValue)
      debug('%s: sorted peer values: %j', this._peerId, peerValues)
      const disconnectPeer = peerValues[0]
      if (disconnectPeer) {
        const peerId = disconnectPeer[0]
        debug('%s: lowest value peer is %s', this._peerId, peerId)
        debug('%s: closing a connection to %j', this._peerId, peerId)
        for (const connection of this._connections.values()) {
          if (connection.remotePeer.toB58String() === peerId) {
            connection.close()
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
