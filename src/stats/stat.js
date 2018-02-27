'use strict'

const EventEmitter = require('events')
const Big = require('big.js')
const MovingAverage = require('moving-average')

class Stats extends EventEmitter {
  constructor (initialCounters, options) {
    super()

    this._options = options
    this._queue = []
    this._stats = {}

    this._frequencyLastTime = Date.now()
    this._frequencyAccumulators = {}
    this._movingAverages = {}

    this._update = this._update.bind(this)

    initialCounters.forEach((key) => {
      this._stats[key] = Big(0)
      this._movingAverages[key] = {}
      this._options.movingAverageIntervals.forEach((interval) => {
        const ma = this._movingAverages[key][interval] = MovingAverage(interval)
        ma.push(this._frequencyLastTime, 0)
      })
    })
  }

  start () {
    if (this._queue.length) {
      this._resetComputeTimeout()
    }
  }

  stop () {
    if (this._timeout) {
      clearTimeout(this._timeout)
    }
  }

  get snapshot () {
    return Object.assign({}, this._stats)
  }

  get movingAverages () {
    return Object.assign({}, this._movingAverages)
  }

  push (counter, inc) {
    this._queue.push([counter, inc, Date.now()])
    this._resetComputeTimeout()
  }

  _resetComputeTimeout () {
    if (this._timeout) {
      clearTimeout(this._timeout)
    }
    this._timeout = setTimeout(this._update, this._nextTimeout())
  }

  _nextTimeout () {
    // calculate the need for an update, depending on the queue length
    const urgency = this._queue.length / this._options.computeThrottleMaxQueueSize
    const timeout = Math.max(this._options.computeThrottleTimeout * (1 - urgency), 0)
    return timeout
  }

  _update () {
    this._timeout = null
    if (this._queue.length) {
      let last
      while (this._queue.length) {
        const op = last = this._queue.shift()
        this._applyOp(op)
      }

      this._updateFrequency(last[2]) // contains timestamp of last op

      this.emit('update', this._stats)
    }
  }

  _updateFrequency (latestTime) {
    const timeDiff = latestTime - this._frequencyLastTime

    Object.keys(this._stats).forEach((key) => {
      this._updateFrequencyFor(key, timeDiff, latestTime)
    })

    this._frequencyLastTime = latestTime
  }

  _updateFrequencyFor (key, timeDiffMS, latestTime) {
    const count = this._frequencyAccumulators[key] || 0
    this._frequencyAccumulators[key] = 0
    const hz = (count / timeDiffMS) * 1000

    let movingAverages = this._movingAverages[key]
    if (!movingAverages) {
      movingAverages = this._movingAverages[key] = {}
    }
    this._options.movingAverageIntervals.forEach((movingAverageInterval) => {
      let movingAverage = movingAverages[movingAverageInterval]
      if (!movingAverage) {
        movingAverage = movingAverages[movingAverageInterval] = MovingAverage(movingAverageInterval)
      }
      movingAverage.push(latestTime, hz)
    })
  }

  _applyOp (op) {
    const key = op[0]
    const inc = op[1]

    if (typeof inc !== 'number') {
      throw new Error('invalid increment number:', inc)
    }

    let n

    if (!this._stats.hasOwnProperty(key)) {
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
