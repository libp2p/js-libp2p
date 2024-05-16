import { setMaxListeners } from '@libp2p/interface'
import { anySignal, type ClearableSignal } from 'any-signal'
import { MovingAverage } from './moving-average.js'
import type { MetricGroup, Metrics } from '@libp2p/interface'

export const DEFAULT_TIMEOUT_MULTIPLIER = 1.2
export const DEFAULT_FAILURE_MULTIPLIER = 2
export const DEFAULT_MIN_TIMEOUT = 2000

export interface AdaptiveTimeoutSignal extends ClearableSignal {
  start: number
  timeout: number
}

export interface AdaptiveTimeoutInit {
  metricName?: string
  metrics?: Metrics
  interval?: number
  initialValue?: number
  timeoutMultiplier?: number
  failureMultiplier?: number
  minTimeout?: number
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

  constructor (init: AdaptiveTimeoutInit = {}) {
    this.success = new MovingAverage(init.interval ?? 5000)
    this.failure = new MovingAverage(init.interval ?? 5000)
    this.next = new MovingAverage(init.interval ?? 5000)
    this.failureMultiplier = init.failureMultiplier ?? DEFAULT_FAILURE_MULTIPLIER
    this.timeoutMultiplier = init.timeoutMultiplier ?? DEFAULT_TIMEOUT_MULTIPLIER
    this.minTimeout = init.minTimeout ?? DEFAULT_MIN_TIMEOUT

    if (init.metricName != null) {
      this.metric = init.metrics?.registerMetricGroup(init.metricName)
    }
  }

  getTimeoutSignal (options: GetTimeoutSignalOptions = {}): AdaptiveTimeoutSignal {
    // calculate timeout for individual peers based on moving average of
    // previous successful requests
    const timeout = Math.max(
      Math.round(this.next.movingAverage * (options.timeoutFactor ?? this.timeoutMultiplier)),
      this.minTimeout
    )
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
