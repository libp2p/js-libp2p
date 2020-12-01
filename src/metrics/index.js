// @ts-nocheck
'use strict'

const mergeOptions = require('merge-options')
const { pipe } = require('it-pipe')
const { tap } = require('streaming-iterables')
const oldPeerLRU = require('./old-peers')
const { METRICS: defaultOptions } = require('../constants')
const Stats = require('./stats')

const initialCounters = [
  'dataReceived',
  'dataSent'
]

const directionToEvent = {
  in: 'dataReceived',
  out: 'dataSent'
}

/**
 * @typedef {import('peer-id')} PeerId
 * @typedef {import('libp2p-interfaces/src/transport/types').MultiaddrConnection} MultiaddrConnection
 */

/**
 * @typedef MetricsProperties
 * @property {import('../connection-manager')} connectionManager
 *
 * @typedef MetricsOptions
 * @property {number} [computeThrottleMaxQueueSize = defaultOptions.computeThrottleMaxQueueSize]
 * @property {number} [computeThrottleTimeout = defaultOptions.computeThrottleTimeout]
 * @property {number[]} [movingAverageIntervals = defaultOptions.movingAverageIntervals]
 * @property {number} [maxOldPeersRetention = defaultOptions.maxOldPeersRetention]
 */

class Metrics {
  /**
   * @class
   * @param {MetricsProperties & MetricsOptions} options
   */
  constructor (options) {
    this._options = mergeOptions(defaultOptions, options)
    this._globalStats = new Stats(initialCounters, this._options)
    this._peerStats = new Map()
    this._protocolStats = new Map()
    this._oldPeers = oldPeerLRU(this._options.maxOldPeersRetention)
    this._running = false
    this._onMessage = this._onMessage.bind(this)
    this._connectionManager = options.connectionManager
    this._connectionManager.on('peer:disconnect', (connection) => {
      this.onPeerDisconnected(connection.remotePeer)
    })
  }

  /**
   * Must be called for stats to saved. Any data pushed for tracking
   * will be ignored.
   */
  start () {
    this._running = true
  }

  /**
   * Stops all averages timers and prevents new data from being tracked.
   * Once `stop` is called, `start` must be called to resume stats tracking.
   */
  stop () {
    this._running = false
    this._globalStats.stop()
    for (const stats of this._peerStats.values()) {
      stats.stop()
    }
    for (const stats of this._protocolStats.values()) {
      stats.stop()
    }
  }

  /**
   * Gets the global `Stats` object
   *
   * @returns {Stats}
   */
  get global () {
    return this._globalStats
  }

  /**
   * Returns a list of `PeerId` strings currently being tracked
   *
   * @returns {string[]}
   */
  get peers () {
    return Array.from(this._peerStats.keys())
  }

  /**
   * Returns the `Stats` object for the given `PeerId` whether it
   * is a live peer, or in the disconnected peer LRU cache.
   *
   * @param {PeerId} peerId
   * @returns {Stats}
   */
  forPeer (peerId) {
    const idString = peerId.toB58String()
    return this._peerStats.get(idString) || this._oldPeers.get(idString)
  }

  /**
   * Returns a list of all protocol strings currently being tracked.
   *
   * @returns {string[]}
   */
  get protocols () {
    return Array.from(this._protocolStats.keys())
  }

  /**
   * Returns the `Stats` object for the given `protocol`.
   *
   * @param {string} protocol
   * @returns {Stats}
   */
  forProtocol (protocol) {
    return this._protocolStats.get(protocol)
  }

  /**
   * Should be called when all connections to a given peer
   * have closed. The `Stats` collection for the peer will
   * be stopped and moved to an LRU for temporary retention.
   *
   * @param {PeerId} peerId
   */
  onPeerDisconnected (peerId) {
    const idString = peerId.toB58String()
    const peerStats = this._peerStats.get(idString)
    if (peerStats) {
      peerStats.stop()
      this._peerStats.delete(idString)
      this._oldPeers.set(idString, peerStats)
    }
  }

  /**
   * Takes the metadata for a message and tracks it in the
   * appropriate categories. If the protocol is present, protocol
   * stats will also be tracked.
   *
   * @private
   * @param {object} params
   * @param {PeerId} params.remotePeer - Remote peer
   * @param {string} [params.protocol] - Protocol string the stream is running
   * @param {string} params.direction - One of ['in','out']
   * @param {number} params.dataLength - Size of the message
   * @returns {void}
   */
  _onMessage ({ remotePeer, protocol, direction, dataLength }) {
    if (!this._running) return

    const key = directionToEvent[direction]

    let peerStats = this.forPeer(remotePeer)
    if (!peerStats) {
      peerStats = new Stats(initialCounters, this._options)
      this._peerStats.set(remotePeer.toB58String(), peerStats)
    }

    // Peer and global stats
    peerStats.push(key, dataLength)
    this._globalStats.push(key, dataLength)

    // Protocol specific stats
    if (protocol) {
      let protocolStats = this.forProtocol(protocol)
      if (!protocolStats) {
        protocolStats = new Stats(initialCounters, this._options)
        this._protocolStats.set(protocol, protocolStats)
      }
      protocolStats.push(key, dataLength)
    }
  }

  /**
   * Replaces the `PeerId` string with the given `peerId`.
   * If stats are already being tracked for the given `peerId`, the
   * placeholder stats will be merged with the existing stats.
   *
   * @param {PeerId} placeholder - A peerId string
   * @param {PeerId} peerId
   * @returns {void}
   */
  updatePlaceholder (placeholder, peerId) {
    if (!this._running) return
    const placeholderStats = this.forPeer(placeholder)
    const peerIdString = peerId.toB58String()
    const existingStats = this.forPeer(peerId)
    let mergedStats = placeholderStats

    // If we already have stats, merge the two
    if (existingStats) {
      // If existing, merge
      mergedStats = Metrics.mergeStats(existingStats, mergedStats)
      // Attempt to delete from the old peers list just in case it was tracked there
      this._oldPeers.delete(peerIdString)
    }

    this._peerStats.delete(placeholder.toB58String())
    this._peerStats.set(peerIdString, mergedStats)
    mergedStats.start()
  }

  /**
   * Tracks data running through a given Duplex Iterable `stream`. If
   * the `peerId` is not provided, a placeholder string will be created and
   * returned. This allows lazy tracking of a peer when the peer is not yet known.
   * When the `PeerId` is known, `Metrics.updatePlaceholder` should be called
   * with the placeholder string returned from here, and the known `PeerId`.
   *
   * @param {Object} options
   * @param {MultiaddrConnection} options.stream - A duplex iterable stream
   * @param {PeerId} [options.remotePeer] - The id of the remote peer that's connected
   * @param {string} [options.protocol] - The protocol the stream is running
   * @returns {MultiaddrConnection} The peerId string or placeholder string
   */
  trackStream ({ stream, remotePeer, protocol }) {
    const metrics = this
    const _source = stream.source
    stream.source = tap(chunk => metrics._onMessage({
      remotePeer,
      protocol,
      direction: 'in',
      dataLength: chunk.length
    }))(_source)

    const _sink = stream.sink
    stream.sink = source => {
      return pipe(
        source,
        tap(chunk => metrics._onMessage({
          remotePeer,
          protocol,
          direction: 'out',
          dataLength: chunk.length
        })),
        _sink
      )
    }

    return stream
  }

  /**
   * Merges `other` into `target`. `target` will be modified
   * and returned.
   *
   * @param {Stats} target
   * @param {Stats} other
   * @returns {Stats}
   */
  static mergeStats (target, other) {
    target.stop()
    other.stop()

    // Merge queues
    target._queue = [...target._queue, ...other._queue]

    // TODO: how to merge moving averages?
    return target
  }
}

module.exports = Metrics
