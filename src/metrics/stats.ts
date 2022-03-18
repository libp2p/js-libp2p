// @ts-nocheck
'use strict'

const { EventEmitter } = require('events')
const { BigNumber: Big } = require('bignumber.js')
const MovingAverage = require('@vascosantos/moving-average')
const retimer = require('retimer')

/**
 * @typedef {import('@vascosantos/moving-average').IMovingAverage} IMovingAverage
 * @typedef {import('bignumber.js').BigNumber} Big
 */

class Stats extends EventEmitter {
  /**
   * A queue based manager for stat processing
   *
   * @class
   * @param {string[]} initialCounters
   * @param {any} options
   */
  constructor (initialCounters, options) {
    super()

    this._options = options
    this._queue = []

    /** @type {{ dataReceived: Big, dataSent: Big }} */
    this._stats = {
      dataReceived: Big(0),
      dataSent: Big(0)
    }

    this._frequencyLastTime = Date.now()
    this._frequencyAccumulators = {}

    /** @type {{ dataReceived: IMovingAverage[], dataSent: IMovingAverage[] }} */
    this._movingAverages = {}

    this._update = this._update.bind(this)

    const intervals = this._options.movingAverageIntervals

    for (let i = 0; i < initialCounters.length; i++) {
      const key = initialCounters[i]
      this._stats[key] = Big(0)
      this._movingAverages[key] = {}
      for (let k = 0; k < intervals.length; k++) {
        const interval = intervals[k]
        const ma = this._movingAverages[key][interval] = MovingAverage(interval)
        ma.push(this._frequencyLastTime, 0)
      }
    }
  }

  /**
   * Initializes the internal timer if there are items in the queue. This
   * should only need to be called if `Stats.stop` was previously called, as
   * `Stats.push` will also start the processing.
   *
   * @returns {void}
   */
  start () {
    if (this._queue.length) {
      this._resetComputeTimeout()
    }
  }

  /**
   * Stops processing and computing of stats by clearing the internal
   * timer.
   *
   * @returns {void}
   */
  stop () {
    if (this._timeout) {
      this._timeout.clear()
      this._timeout = null
    }
  }

  /**
   * Returns a clone of the current stats.
   */
  get snapshot () {
    return Object.assign({}, this._stats)
  }

  /**
   * Returns a clone of the internal movingAverages
   */
  get movingAverages () {
    return Object.assign({}, this._movingAverages)
  }

  /**
   * Returns a plain JSON object of the stats
   *
   * @returns {*}
   */
  toJSON () {
    const snapshot = this.snapshot
    const movingAverages = this.movingAverages
    const data = {
      dataReceived: snapshot.dataReceived.toString(),
      dataSent: snapshot.dataSent.toString(),
      movingAverages: {}
    }

    const counters = Object.keys(movingAverages)
    for (const key of counters) {
      data.movingAverages[key] = {}
      for (const interval of Object.keys(movingAverages[key])) {
        data.movingAverages[key][interval] = movingAverages[key][interval].movingAverage()
      }
    }

    return data
  }

  /**
   * Pushes the given operation data to the queue, along with the
   * current Timestamp, then resets the update timer.
   *
   * @param {string} counter
   * @param {number} inc
   * @returns {void}
   */
  push (counter, inc) {
    this._queue.push([counter, inc, Date.now()])
    this._resetComputeTimeout()
  }

  /**
   * Resets the timeout for triggering updates.
   *
   * @private
   * @returns {void}
   */
  _resetComputeTimeout () {
    this._timeout = retimer(this._update, this._nextTimeout())
  }

  /**
   * Calculates and returns the timeout for the next update based on
   * the urgency of the update.
   *
   * @private
   * @returns {number}
   */
  _nextTimeout () {
    // calculate the need for an update, depending on the queue length
    const urgency = this._queue.length / this._options.computeThrottleMaxQueueSize
    const timeout = Math.max(this._options.computeThrottleTimeout * (1 - urgency), 0)
    return timeout
  }

  /**
   * If there are items in the queue, they will will be processed and
   * the frequency for all items will be updated based on the Timestamp
   * of the last item in the queue. The `update` event will also be emitted
   * with the latest stats.
   *
   * If there are no items in the queue, no action is taken.
   *
   * @private
   * @returns {void}
   */
  _update () {
    this._timeout = null
    if (this._queue.length) {
      let last
      for (last of this._queue) {
        this._applyOp(last)
      }
      this._queue = []

      this._updateFrequency(last[2]) // contains timestamp of last op

      this.emit('update', this._stats)
    }
  }

  /**
   * For each key in the stats, the frequency and moving averages
   * will be updated via Stats._updateFrequencyFor based on the time
   * difference between calls to this method.
   *
   * @private
   * @param {Timestamp} latestTime
   * @returns {void}
   */
  _updateFrequency (latestTime) {
    const timeDiff = latestTime - this._frequencyLastTime

    Object.keys(this._stats).forEach((key) => {
      this._updateFrequencyFor(key, timeDiff, latestTime)
    })

    this._frequencyLastTime = latestTime
  }

  /**
   * Updates the `movingAverages` for the given `key` and also
   * resets the `frequencyAccumulator` for the `key`.
   *
   * @private
   * @param {string} key
   * @param {number} timeDiffMS - Time in milliseconds
   * @param {Timestamp} latestTime - Time in ticks
   * @returns {void}
   */
  _updateFrequencyFor (key, timeDiffMS, latestTime) {
    const count = this._frequencyAccumulators[key] || 0
    this._frequencyAccumulators[key] = 0
    // if `timeDiff` is zero, `hz` becomes Infinity, so we fallback to 1ms
    const safeTimeDiff = timeDiffMS || 1
    const hz = (count / safeTimeDiff) * 1000

    let movingAverages = this._movingAverages[key]
    if (!movingAverages) {
      movingAverages = this._movingAverages[key] = {}
    }

    const intervals = this._options.movingAverageIntervals

    for (let i = 0; i < intervals.length; i++) {
      const movingAverageInterval = intervals[i]
      let movingAverage = movingAverages[movingAverageInterval]
      if (!movingAverage) {
        movingAverage = movingAverages[movingAverageInterval] = MovingAverage(movingAverageInterval)
      }
      movingAverage.push(latestTime, hz)
    }
  }

  /**
   * For the given operation, `op`, the stats and `frequencyAccumulator`
   * will be updated or initialized if they don't already exist.
   *
   * @private
   * @param {{string, number}[]} op
   * @throws {InvalidNumber}
   * @returns {void}
   */
  _applyOp (op) {
    const key = op[0]
    const inc = op[1]

    if (typeof inc !== 'number') {
      throw new Error(`invalid increment number: ${inc}`)
    }

    let n

    if (!Object.prototype.hasOwnProperty.call(this._stats, key)) {
      n = this._stats[key] = Big(0)
    } else {
      n = this._stats[key]
    }
    this._stats[key] = n.plus(inc)

    if (!this._frequencyAccumulators[key]) {
      this._frequencyAccumulators[key] = 0
    }
    this._frequencyAccumulators[key] += inc
  }
}

module.exports = Stats
