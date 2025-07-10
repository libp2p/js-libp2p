import { anySignal } from 'any-signal'
import { setMaxListeners } from 'main-event'
import { MovingAverage } from './moving-average.js'
import type { MetricGroup, Metrics } from '@libp2p/interface'
import type { ClearableSignal } from 'any-signal'

export const DEFAULT_TIMEOUT_MULTIPLIER = 1.2
export const DEFAULT_FAILURE_MULTIPLIER = 2
export const DEFAULT_MIN_TIMEOUT = 5_000
export const DEFAULT_MAX_TIMEOUT = 60_000
export const DEFAULT_INTERVAL = 5_000

export interface AdaptiveTimeoutSignal extends ClearableSignal {
  start: number
  timeout: number
}

export interface AdaptiveTimeoutInit {
  metricName?: string
  metrics?: Metrics
  interval?: number
  timeoutMultiplier?: number
  failureMultiplier?: number
  minTimeout?: number
  maxTimeout?: number
}

export interface GetTimeoutSignalOptions {
  timeoutFactor?: number
  signal?: AbortSignal
}

export class AdaptiveTimeout {
  private readonly success: MovingAverage
  private readonly failure: MovingAverage
  private readonly next: MovingAverage
  private readonly metric?: MetricGroup
  private readonly timeoutMultiplier: number
  private readonly failureMultiplier: number
  private readonly minTimeout: number
  private readonly maxTimeout: number

  constructor (init: AdaptiveTimeoutInit = {}) {
    const interval = init.interval ?? DEFAULT_INTERVAL
    this.success = new MovingAverage(interval)
    this.failure = new MovingAverage(interval)
    this.next = new MovingAverage(interval)
    this.failureMultiplier = init.failureMultiplier ?? DEFAULT_FAILURE_MULTIPLIER
    this.timeoutMultiplier = init.timeoutMultiplier ?? DEFAULT_TIMEOUT_MULTIPLIER
    this.minTimeout = init.minTimeout ?? DEFAULT_MIN_TIMEOUT
    this.maxTimeout = init.maxTimeout ?? DEFAULT_MAX_TIMEOUT

    if (init.metricName != null) {
      this.metric = init.metrics?.registerMetricGroup(init.metricName)
    }
  }

  getTimeoutSignal (options: GetTimeoutSignalOptions = {}): AdaptiveTimeoutSignal {
    // calculate timeout for individual peers based on moving average of
    // previous successful requests
    let timeout = Math.round(this.next.movingAverage * (options.timeoutFactor ?? this.timeoutMultiplier))

    if (timeout < this.minTimeout) {
      timeout = this.minTimeout
    }

    if (timeout > this.maxTimeout) {
      timeout = this.maxTimeout
    }

    const sendTimeout = AbortSignal.timeout(timeout)
    const timeoutSignal = anySignal([options.signal, sendTimeout]) as AdaptiveTimeoutSignal
    setMaxListeners(Infinity, timeoutSignal, sendTimeout)

    timeoutSignal.start = Date.now()
    timeoutSignal.timeout = timeout

    return timeoutSignal
  }

  cleanUp (signal: AdaptiveTimeoutSignal): void {
    const time = Date.now() - signal.start

    if (signal.aborted) {
      this.failure.push(time)
      this.next.push(time * this.failureMultiplier)
      this.metric?.update({
        failureMovingAverage: this.failure.movingAverage,
        failureDeviation: this.failure.deviation,
        failureForecast: this.failure.forecast,
        failureVariance: this.failure.variance,
        failure: time
      })
    } else {
      this.success.push(time)
      this.next.push(time)
      this.metric?.update({
        successMovingAverage: this.success.movingAverage,
        successDeviation: this.success.deviation,
        successForecast: this.success.forecast,
        successVariance: this.success.variance,
        success: time
      })
    }
  }
}
