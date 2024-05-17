/**
 * @packageDocumentation
 *
 * Stores metrics in memory and periodically invokes a configured callback to
 * receive them.
 *
 * @example
 *
 * ```ts
 * import { createLibp2p } from 'libp2p'
 * import { simpleMetrics } from '@libp2p/simple-metrics'
 *
 * const node = await createLibp2p({
 *   // ... other options
 *   metrics: simpleMetrics({
 *     onMetrics: (metrics) => {
 *       // do something with metrics
 *     }
 *   }),
 *   intervalMs: 1000 // default 1s
 * })
 *
 * ```
 */

import { logger } from '@libp2p/logger'
import each from 'it-foreach'
import type { Startable, MultiaddrConnection, Stream, Connection, Metric, MetricGroup, StopTimer, Metrics, CalculatedMetricOptions, MetricOptions, Counter, CounterGroup, CalculateMetric } from '@libp2p/interface'
import type { Duplex } from 'it-stream-types'

const log = logger('libp2p:simple-metrics')

class DefaultMetric implements Metric {
  public value: number = 0

  update (value: number): void {
    this.value = value
  }

  increment (value: number = 1): void {
    this.value += value
  }

  decrement (value: number = 1): void {
    this.value -= value
  }

  reset (): void {
    this.value = 0
  }

  timer (): StopTimer {
    const start = Date.now()

    return () => {
      this.value = Date.now() - start
    }
  }
}

class DefaultGroupMetric implements MetricGroup {
  public values: Record<string, number> = {}

  update (values: Record<string, number>): void {
    Object.entries(values).forEach(([key, value]) => {
      this.values[key] = value
    })
  }

  increment (values: Record<string, number | unknown>): void {
    Object.entries(values).forEach(([key, value]) => {
      this.values[key] = this.values[key] ?? 0
      const inc = typeof value === 'number' ? value : 1

      this.values[key] += Number(inc)
    })
  }

  decrement (values: Record<string, number | unknown>): void {
    Object.entries(values).forEach(([key, value]) => {
      this.values[key] = this.values[key] ?? 0
      const dec = typeof value === 'number' ? value : 1

      this.values[key] -= Number(dec)
    })
  }

  reset (): void {
    this.values = {}
  }

  timer (key: string): StopTimer {
    const start = Date.now()

    return () => {
      this.values[key] = Date.now() - start
    }
  }
}

export interface OnMetrics { (metrics: Record<string, any>): void }

export interface SimpleMetricsInit {
  /**
   * How often to invoke the onMetrics callback
   */
  intervalMs?: number

  /**
   * A callback periodically invoked with collected metrics
   */
  onMetrics: OnMetrics
}

class SimpleMetrics implements Metrics, Startable {
  public metrics = new Map<string, DefaultMetric | DefaultGroupMetric | CalculateMetric>()
  private readonly transferStats: Map<string, number>
  private started: boolean
  private interval?: ReturnType<typeof setInterval>
  private readonly intervalMs: number
  private readonly onMetrics: OnMetrics

  constructor (components: unknown, init: SimpleMetricsInit) {
    this.started = false

    this._emitMetrics = this._emitMetrics.bind(this)

    this.intervalMs = init.intervalMs ?? 1000
    this.onMetrics = init.onMetrics

    // holds global and per-protocol sent/received stats
    this.transferStats = new Map()
  }

  isStarted (): boolean {
    return this.started
  }

  start (): void {
    this.started = true

    this.interval = setInterval(this._emitMetrics, this.intervalMs)
  }

  stop (): void {
    this.started = false

    clearInterval(this.interval)
  }

  private _emitMetrics (): void {
    void Promise.resolve().then(async () => {
      const output: Record<string, any> = {}

      for (const [name, metric] of this.metrics.entries()) {
        if (metric instanceof DefaultMetric) {
          output[name] = metric.value
        } else if (metric instanceof DefaultGroupMetric) {
          output[name] = metric.values
        } else {
          output[name] = await metric()
        }
      }

      this.onMetrics(structuredClone(output))
    })
      .catch(err => {
        log.error('could not invoke onMetrics callback', err)
      })
  }

  /**
   * Increment the transfer stat for the passed key, making sure
   * it exists first
   */
  _incrementValue (key: string, value: number): void {
    const existing = this.transferStats.get(key) ?? 0

    this.transferStats.set(key, existing + value)
  }

  /**
   * Override the sink/source of the stream to count the bytes
   * in and out
   */
  _track (stream: Duplex<AsyncGenerator<any>>, name: string): void {
    const self = this

    const sink = stream.sink
    stream.sink = async function trackedSink (source) {
      await sink(each(source, buf => {
        self._incrementValue(`${name} sent`, buf.byteLength)
      }))
    }

    const source = stream.source
    stream.source = each(source, buf => {
      self._incrementValue(`${name} received`, buf.byteLength)
    })
  }

  trackMultiaddrConnection (maConn: MultiaddrConnection): void {
    this._track(maConn, 'global')
  }

  trackProtocolStream (stream: Stream, connection: Connection): void {
    if (stream.protocol == null) {
      // protocol not negotiated yet, should not happen as the upgrader
      // calls this handler after protocol negotiation
      return
    }

    this._track(stream, stream.protocol)
  }

  registerMetric (name: string, opts: CalculatedMetricOptions): void
  registerMetric (name: string, opts?: MetricOptions): Metric
  registerMetric (name: string, opts: any = {}): any {
    if (name == null || name.trim() === '') {
      throw new Error('Metric name is required')
    }

    if (opts?.calculate != null) {
      // calculated metric
      this.metrics.set(name, opts.calculate)
      return
    }

    const metric = new DefaultMetric()
    this.metrics.set(name, metric)

    return metric
  }

  registerMetricGroup (name: string, opts: CalculatedMetricOptions<Record<string, number>>): void
  registerMetricGroup (name: string, opts?: MetricOptions): MetricGroup
  registerMetricGroup (name: string, opts: any = {}): any {
    if (name == null || name.trim() === '') {
      throw new Error('Metric name is required')
    }

    if (opts?.calculate != null) {
      // calculated metric
      this.metrics.set(name, opts.calculate)
      return
    }

    const metric = new DefaultGroupMetric()
    this.metrics.set(name, metric)

    return metric
  }

  registerCounter (name: string, opts: CalculatedMetricOptions): void
  registerCounter (name: string, opts?: MetricOptions): Counter
  registerCounter (name: string, opts: any = {}): any {
    if (name == null || name.trim() === '') {
      throw new Error('Metric name is required')
    }

    if (opts?.calculate != null) {
      // calculated metric
      this.metrics.set(name, opts.calculate)
      return
    }

    const metric = new DefaultMetric()
    this.metrics.set(name, metric)

    return metric
  }

  registerCounterGroup (name: string, opts: CalculatedMetricOptions<Record<string, number>>): void
  registerCounterGroup (name: string, opts?: MetricOptions): CounterGroup
  registerCounterGroup (name: string, opts: any = {}): any {
    if (name == null || name.trim() === '') {
      throw new Error('Metric name is required')
    }

    if (opts?.calculate != null) {
      // calculated metric
      this.metrics.set(name, opts.calculate)
      return
    }

    const metric = new DefaultGroupMetric()
    this.metrics.set(name, metric)

    return metric
  }
}

export function simpleMetrics (init: SimpleMetricsInit): (components: unknown) => Metrics {
  return (components: unknown) => new SimpleMetrics(components, init)
}
