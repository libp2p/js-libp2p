import { CustomEvent, EventEmitter } from '@libp2p/interfaces/events'
import { createMovingAverage } from './moving-average.js'
// @ts-expect-error no types
import retimer from 'retimer'
import type { MovingAverages, Stats, TransferStats } from '@libp2p/interfaces/metrics'

export interface StatsEvents {
  'update': CustomEvent<TransferStats>
}

export interface StatsInit {
  enabled: boolean
  initialCounters: ['dataReceived', 'dataSent']
  movingAverageIntervals: number[]
  computeThrottleMaxQueueSize: number
  computeThrottleTimeout: number
}

export class DefaultStats extends EventEmitter<StatsEvents> implements Stats {
  private readonly enabled: boolean
  public queue: Array<[string, number, number]>
  private stats: TransferStats
  private frequencyLastTime: number
  private frequencyAccumulators: Record<string, number>
  private movingAverages: MovingAverages
  private timeout?: any
  private readonly computeThrottleMaxQueueSize: number
  private readonly computeThrottleTimeout: number
  private readonly movingAverageIntervals: number[]

  /**
   * A queue based manager for stat processing
   */
  constructor (init: StatsInit) {
    super()

    this.enabled = init.enabled
    this.queue = []
    this.stats = {
      dataReceived: 0n,
      dataSent: 0n
    }
    this.frequencyLastTime = Date.now()
    this.frequencyAccumulators = {}
    this.movingAverages = {
      dataReceived: [],
      dataSent: []
    }
    this.computeThrottleMaxQueueSize = init.computeThrottleMaxQueueSize
    this.computeThrottleTimeout = init.computeThrottleTimeout

    this._update = this._update.bind(this)

    this.movingAverageIntervals = init.movingAverageIntervals

    for (let i = 0; i < init.initialCounters.length; i++) {
      const key = init.initialCounters[i]
      this.stats[key] = 0n
      this.movingAverages[key] = []

      for (let k = 0; k < this.movingAverageIntervals.length; k++) {
        const interval = this.movingAverageIntervals[k]
        const ma = this.movingAverages[key][interval] = createMovingAverage(interval)
        ma.push(this.frequencyLastTime, 0)
      }
    }
  }

  /**
   * Initializes the internal timer if there are items in the queue. This
   * should only need to be called if `Stats.stop` was previously called, as
   * `Stats.push` will also start the processing
   */
  start () {
    if (!this.enabled) {
      return
    }

    if (this.queue.length > 0) {
      this._resetComputeTimeout()
    }
  }

  /**
   * Stops processing and computing of stats by clearing the internal
   * timer
   */
  stop () {
    if (this.timeout != null) {
      this.timeout.clear()
      this.timeout = null
    }
  }

  /**
   * Returns a clone of the current stats.
   */
  getSnapshot () {
    return Object.assign({}, this.stats)
  }

  /**
   * Returns a clone of the internal movingAverages
   */
  getMovingAverages (): MovingAverages {
    return Object.assign({}, this.movingAverages)
  }

  /**
   * Pushes the given operation data to the queue, along with the
   * current Timestamp, then resets the update timer.
   */
  push (counter: string, inc: number) {
    this.queue.push([counter, inc, Date.now()])
    this._resetComputeTimeout()
  }

  /**
   * Resets the timeout for triggering updates.
   */
  _resetComputeTimeout () {
    this.timeout = retimer(this._update, this._nextTimeout())
  }

  /**
   * Calculates and returns the timeout for the next update based on
   * the urgency of the update.
   */
  _nextTimeout () {
    // calculate the need for an update, depending on the queue length
    const urgency = this.queue.length / this.computeThrottleMaxQueueSize
    const timeout = Math.max(this.computeThrottleTimeout * (1 - urgency), 0)
    return timeout
  }

  /**
   * If there are items in the queue, they will will be processed and
   * the frequency for all items will be updated based on the Timestamp
   * of the last item in the queue. The `update` event will also be emitted
   * with the latest stats.
   *
   * If there are no items in the queue, no action is taken.
   */
  _update () {
    this.timeout = null
    if (this.queue.length > 0) {
      let last: [string, number, number] = ['', 0, 0]

      for (last of this.queue) {
        this._applyOp(last)
      }

      this.queue = []

      if (last.length > 2 && last[0] !== '') {
        this._updateFrequency(last[2]) // contains timestamp of last op
      }

      this.dispatchEvent(new CustomEvent<TransferStats>('update', {
        detail: this.stats
      }))
    }
  }

  /**
   * For each key in the stats, the frequency and moving averages
   * will be updated via Stats._updateFrequencyFor based on the time
   * difference between calls to this method.
   */
  _updateFrequency (latestTime: number) {
    const timeDiff = latestTime - this.frequencyLastTime

    this._updateFrequencyFor('dataReceived', timeDiff, latestTime)
    this._updateFrequencyFor('dataSent', timeDiff, latestTime)

    this.frequencyLastTime = latestTime
  }

  /**
   * Updates the `movingAverages` for the given `key` and also
   * resets the `frequencyAccumulator` for the `key`.
   */
  _updateFrequencyFor (key: 'dataReceived' | 'dataSent', timeDiffMS: number, latestTime: number) {
    const count = this.frequencyAccumulators[key] ?? 0
    this.frequencyAccumulators[key] = 0
    // if `timeDiff` is zero, `hz` becomes Infinity, so we fallback to 1ms
    const safeTimeDiff = timeDiffMS ?? 1
    const hz = (count / safeTimeDiff) * 1000

    let movingAverages = this.movingAverages[key]
    if (movingAverages == null) {
      movingAverages = this.movingAverages[key] = []
    }

    const intervals = this.movingAverageIntervals

    for (let i = 0; i < intervals.length; i++) {
      const movingAverageInterval = intervals[i]
      let movingAverage = movingAverages[movingAverageInterval]
      if (movingAverage == null) {
        movingAverage = movingAverages[movingAverageInterval] = createMovingAverage(movingAverageInterval)
      }
      movingAverage.push(latestTime, hz)
    }
  }

  /**
   * For the given operation, `op`, the stats and `frequencyAccumulator`
   * will be updated or initialized if they don't already exist.
   */
  _applyOp (op: [string, number, number]) {
    const key = op[0]
    const inc = op[1]

    if (typeof inc !== 'number') {
      throw new Error('invalid increment number')
    }

    let n: bigint

    if (!Object.prototype.hasOwnProperty.call(this.stats, key)) {
      // @ts-expect-error cannot index type with key
      n = this.stats[key] = 0n
    } else {
      // @ts-expect-error cannot index type with key
      n = this.stats[key]
    }

    // @ts-expect-error cannot index type with key
    this.stats[key] = n + BigInt(inc)

    if (this.frequencyAccumulators[key] == null) {
      this.frequencyAccumulators[key] = 0
    }

    this.frequencyAccumulators[key] += inc
  }
}
