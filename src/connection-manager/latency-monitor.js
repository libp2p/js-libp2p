// @ts-nocheck
'use strict'

/**
 * This code is based on `latency-monitor` (https://github.com/mlucool/latency-monitor) by `mlucool` (https://github.com/mlucool), available under Apache License 2.0 (https://github.com/mlucool/latency-monitor/blob/master/LICENSE)
 */

const { EventEmitter } = require('events')
const VisibilityChangeEmitter = require('./visibility-change-emitter')
const debug = require('debug')('latency-monitor:LatencyMonitor')

/**
 * @typedef {Object} SummaryObject
 * @property {number} events How many events were called
 * @property {number} minMS What was the min time for a cb to be called
 * @property {number} maxMS What was the max time for a cb to be called
 * @property {number} avgMs What was the average time for a cb to be called
 * @property {number} lengthMs How long this interval was in ms
 *
 * @typedef {Object} LatencyMonitorOptions
 * @property {number} [latencyCheckIntervalMs=500] - How often to add a latency check event (ms)
 * @property {number} [dataEmitIntervalMs=5000] - How often to summarize latency check events. null or 0 disables event firing
 * @property {Function} [asyncTestFn] - What cb-style async function to use
 * @property {number} [latencyRandomPercentage=5] - What percent (+/-) of latencyCheckIntervalMs should we randomly use? This helps avoid alignment to other events.
 */

/**
 * A class to monitor latency of any async function which works in a browser or node. This works by periodically calling
 * the asyncTestFn and timing how long it takes the callback to be called. It can also periodically emit stats about this.
 * This can be disabled and stats can be pulled via setting dataEmitIntervalMs = 0.
 *
 * @extends {EventEmitter}
 *
 * The default implementation is an event loop latency monitor. This works by firing periodic events into the event loop
 * and timing how long it takes to get back.
 *
 * @example
 * const monitor = new LatencyMonitor();
 * monitor.on('data', (summary) => console.log('Event Loop Latency: %O', summary));
 *
 * @example
 * const monitor = new LatencyMonitor({latencyCheckIntervalMs: 1000, dataEmitIntervalMs: 60000, asyncTestFn:ping});
 * monitor.on('data', (summary) => console.log('Ping Pong Latency: %O', summary));
 */
class LatencyMonitor extends EventEmitter {
  /**
   * @class
   * @param {LatencyMonitorOptions} [options]
   */
  constructor ({ latencyCheckIntervalMs, dataEmitIntervalMs, asyncTestFn, latencyRandomPercentage } = {}) {
    super()
    const that = this

    // 0 isn't valid here, so its ok to use ||
    that.latencyCheckIntervalMs = latencyCheckIntervalMs || 500 // 0.5s
    that.latencyRandomPercentage = latencyRandomPercentage || 10
    that._latecyCheckMultiply = 2 * (that.latencyRandomPercentage / 100.0) * that.latencyCheckIntervalMs
    that._latecyCheckSubtract = that._latecyCheckMultiply / 2

    that.dataEmitIntervalMs = (dataEmitIntervalMs === null || dataEmitIntervalMs === 0)
      ? undefined
      : dataEmitIntervalMs || 5 * 1000 // 5s
    debug('latencyCheckIntervalMs: %s dataEmitIntervalMs: %s',
      that.latencyCheckIntervalMs, that.dataEmitIntervalMs)
    if (that.dataEmitIntervalMs) {
      debug('Expecting ~%s events per summary', that.latencyCheckIntervalMs / that.dataEmitIntervalMs)
    } else {
      debug('Not emitting summaries')
    }

    that.asyncTestFn = asyncTestFn // If there is no asyncFn, we measure latency
  }

  start () {
    // If process: use high resolution timer
    if (globalThis.process && globalThis.process.hrtime) { // eslint-disable-line no-undef
      debug('Using process.hrtime for timing')
      this.now = globalThis.process.hrtime // eslint-disable-line no-undef
      this.getDeltaMS = (startTime) => {
        const hrtime = this.now(startTime)
        return (hrtime[0] * 1000) + (hrtime[1] / 1000000)
      }
      // Let's try for a timer that only monotonically increases
    } else if (typeof window !== 'undefined' && window.performance && window.performance.now) {
      debug('Using performance.now for timing')
      this.now = window.performance.now.bind(window.performance)
      this.getDeltaMS = (startTime) => Math.round(this.now() - startTime)
    } else {
      debug('Using Date.now for timing')
      this.now = Date.now
      this.getDeltaMS = (startTime) => this.now() - startTime
    }

    this._latencyData = this._initLatencyData()

    // We check for isBrowser because of browsers set max rates of timeouts when a page is hidden,
    // so we fall back to another library
    // See: http://stackoverflow.com/questions/6032429/chrome-timeouts-interval-suspended-in-background-tabs
    if (isBrowser()) {
      this._visibilityChangeEmitter = new VisibilityChangeEmitter()

      this._visibilityChangeEmitter.on('visibilityChange', (pageInFocus) => {
        if (pageInFocus) {
          this._startTimers()
        } else {
          this._emitSummary()
          this._stopTimers()
        }
      })
    }

    if (!this._visibilityChangeEmitter || this._visibilityChangeEmitter.isVisible()) {
      this._startTimers()
    }
  }

  stop () {
    this._stopTimers()
  }

  /**
   * Start internal timers
   *
   * @private
   */
  _startTimers () {
    // Timer already started, ignore this
    if (this._checkLatencyID) {
      return
    }
    this._checkLatency()
    if (this.dataEmitIntervalMs) {
      this._emitIntervalID = setInterval(() => this._emitSummary(), this.dataEmitIntervalMs)
      if (typeof this._emitIntervalID.unref === 'function') {
        this._emitIntervalID.unref() // Doesn't block exit
      }
    }
  }

  /**
   * Stop internal timers
   *
   * @private
   */
  _stopTimers () {
    if (this._checkLatencyID) {
      clearTimeout(this._checkLatencyID)
      this._checkLatencyID = undefined
    }
    if (this._emitIntervalID) {
      clearInterval(this._emitIntervalID)
      this._emitIntervalID = undefined
    }
  }

  /**
   * Emit summary only if there were events. It might not have any events if it was forced via a page hidden/show
   *
   * @private
   */
  _emitSummary () {
    const summary = this.getSummary()
    if (summary.events > 0) {
      this.emit('data', summary)
    }
  }

  /**
   * Calling this function will end the collection period. If a timing event was already fired and somewhere in the queue,
   * it will not count for this time period
   *
   * @returns {SummaryObject}
   */
  getSummary () {
    // We might want to adjust for the number of expected events
    // Example: first 1 event it comes back, then such a long blocker that the next emit check comes
    // Then this fires - looks like no latency!!
    const latency = {
      events: this._latencyData.events,
      minMs: this._latencyData.minMs,
      maxMs: this._latencyData.maxMs,
      avgMs: this._latencyData.events
        ? this._latencyData.totalMs / this._latencyData.events
        : Number.POSITIVE_INFINITY,
      lengthMs: this.getDeltaMS(this._latencyData.startTime)
    }
    this._latencyData = this._initLatencyData() // Clear

    debug('Summary: %O', latency)
    return latency
  }

  /**
   * Randomly calls an async fn every roughly latencyCheckIntervalMs (plus some randomness). If no async fn is found,
   * it will simply report on event loop latency.
   *
   * @private
   */
  _checkLatency () {
    const that = this
    // Randomness is needed to avoid alignment by accident to regular things in the event loop
    const randomness = (Math.random() * that._latecyCheckMultiply) - that._latecyCheckSubtract

    // We use this to ensure that in case some overlap somehow, we don't take the wrong startTime/offset
    const localData = {
      deltaOffset: Math.ceil(that.latencyCheckIntervalMs + randomness),
      startTime: that.now()
    }

    const cb = () => {
      // We are already stopped, ignore this datapoint
      if (!this._checkLatencyID) {
        return
      }
      const deltaMS = that.getDeltaMS(localData.startTime) - localData.deltaOffset
      that._checkLatency() // Start again ASAP

      // Add the data point. If this gets complex, refactor it
      that._latencyData.events++
      that._latencyData.minMs = Math.min(that._latencyData.minMs, deltaMS)
      that._latencyData.maxMs = Math.max(that._latencyData.maxMs, deltaMS)
      that._latencyData.totalMs += deltaMS
      debug('MS: %s Data: %O', deltaMS, that._latencyData)
    }
    debug('localData: %O', localData)

    this._checkLatencyID = setTimeout(() => {
      // This gets rid of including event loop
      if (that.asyncTestFn) {
        // Clear timing related things
        localData.deltaOffset = 0
        localData.startTime = that.now()
        that.asyncTestFn(cb)
      } else {
        // setTimeout is not more accurate than 1ms, so this will ensure positive numbers. Add 1 to emitted data to remove.
        // This is not the best, but for now it'll be just fine. This isn't meant to be sub ms accurate.
        localData.deltaOffset -= 1
        // If there is no function to test, we mean check latency which is a special case that is really cb => cb()
        // We avoid that for the few extra function all overheads. Also, we want to keep the timers different
        cb()
      }
    }, localData.deltaOffset)

    if (typeof this._checkLatencyID.unref === 'function') {
      this._checkLatencyID.unref() // Doesn't block exit
    }
  }

  _initLatencyData () {
    return {
      startTime: this.now(),
      minMs: Number.POSITIVE_INFINITY,
      maxMs: Number.NEGATIVE_INFINITY,
      events: 0,
      totalMs: 0
    }
  }
}

function isBrowser () {
  return typeof window !== 'undefined'
}

module.exports = LatencyMonitor
