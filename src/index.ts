import type { CalculatedMetricOptions, Counter, CounterGroup, Metric, MetricGroup, MetricOptions, Metrics } from '@libp2p/interface-metrics'
import { collectDefaultMetrics, DefaultMetricsCollectorConfiguration, register, Registry } from 'prom-client'
import type { MultiaddrConnection, Stream, Connection } from '@libp2p/interface-connection'
import type { Duplex } from 'it-stream-types'
import each from 'it-foreach'
import { PrometheusMetric } from './metric.js'
import { PrometheusMetricGroup } from './metric-group.js'
import { PrometheusCounter } from './counter.js'
import { PrometheusCounterGroup } from './counter-group.js'
import { logger } from '@libp2p/logger'

const log = logger('libp2p:prometheus-metrics')

// prom-client metrics are global
const metrics = new Map<string, any>()

export interface PrometheusMetricsInit {
  /**
   * Use a custom registry to register metrics.
   * By default, the global registry is used to register metrics.
   */
  registry?: Registry

  /**
   * By default we collect default metrics - CPU, memory etc, to not do
   * this, pass true here
   */
  collectDefaultMetrics?: boolean

  /**
   * prom-client options to pass to the `collectDefaultMetrics` function
   */
  defaultMetrics?: DefaultMetricsCollectorConfiguration

  /**
   * All metrics in prometheus are global so to prevent clashes in naming
   * we reset the global metrics registry on creation - to not do this,
   * pass true here
   */
  preserveExistingMetrics?: boolean
}

export interface PrometheusCalculatedMetricOptions<T=number> extends CalculatedMetricOptions<T> {
  registry?: Registry
}

class PrometheusMetrics implements Metrics {
  private transferStats: Map<string, number>
  private readonly registry?: Registry

  constructor (init?: Partial<PrometheusMetricsInit>) {
    this.registry = init?.registry

    if (init?.preserveExistingMetrics !== true) {
      log('Clearing existing metrics')
      metrics.clear()
      ;(this.registry ?? register).clear()
    }

    if (init?.collectDefaultMetrics !== false) {
      log('Collecting default metrics')
      collectDefaultMetrics({ ...init?.defaultMetrics, register: this.registry ?? init?.defaultMetrics?.register })
    }

    // holds global and per-protocol sent/received stats
    this.transferStats = new Map()

    log('Collecting data transfer metrics')
    this.registerCounterGroup('libp2p_data_transfer_bytes_total', {
      label: 'protocol',
      calculate: () => {
        const output: Record<string, number> = {}

        for (const [key, value] of this.transferStats.entries()) {
          output[key] = value
        }

        // reset counts for next time
        this.transferStats = new Map()

        return output
      }
    })

    log('Collecting memory metrics')
    this.registerMetricGroup('nodejs_memory_usage_bytes', {
      label: 'memory',
      calculate: () => {
        return {
          ...process.memoryUsage()
        }
      }
    })
  }

  /**
   * Increment the transfer stat for the passed key, making sure
   * it exists first
   */
  _incrementValue (key: string, value: number) {
    const existing = this.transferStats.get(key) ?? 0

    this.transferStats.set(key, existing + value)
  }

  /**
   * Override the sink/source of the stream to count the bytes
   * in and out
   */
  _track (stream: Duplex<any>, name: string) {
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
    if (stream.stat.protocol == null) {
      // protocol not negotiated yet, should not happen as the upgrader
      // calls this handler after protocol negotiation
      return
    }

    this._track(stream, stream.stat.protocol)
  }

  registerMetric (name: string, opts: PrometheusCalculatedMetricOptions): void
  registerMetric (name: string, opts?: MetricOptions): Metric
  registerMetric (name: string, opts: any = {}): any {
    if (name == null ?? name.trim() === '') {
      throw new Error('Metric name is required')
    }

    let metric = metrics.get(name)

    if (metrics.has(name)) {
      log('Reuse existing metric', name)

      if (opts.calculate != null) {
        metric.addCalculator(opts.calculate)
      }

      return metrics.get(name)
    }

    log('Register metric', name)
    metric = new PrometheusMetric(name, { registry: this.registry, ...opts })

    metrics.set(name, metric)

    if (opts.calculate == null) {
      return metric
    }
  }

  registerMetricGroup (name: string, opts: PrometheusCalculatedMetricOptions<Record<string, number>>): void
  registerMetricGroup (name: string, opts?: MetricOptions): MetricGroup
  registerMetricGroup (name: string, opts: any = {}): any {
    if (name == null ?? name.trim() === '') {
      throw new Error('Metric group name is required')
    }

    let metricGroup = metrics.get(name)

    if (metricGroup != null) {
      log('Reuse existing metric group', name)

      if (opts.calculate != null) {
        metricGroup.addCalculator(opts.calculate)
      }

      return metricGroup
    }

    log('Register metric group', name)
    metricGroup = new PrometheusMetricGroup(name, { registry: this.registry, ...opts })

    metrics.set(name, metricGroup)

    if (opts.calculate == null) {
      return metricGroup
    }
  }

  registerCounter (name: string, opts: PrometheusCalculatedMetricOptions): void
  registerCounter (name: string, opts?: MetricOptions): Counter
  registerCounter (name: string, opts: any = {}): any {
    if (name == null ?? name.trim() === '') {
      throw new Error('Counter name is required')
    }

    let counter = metrics.get(name)

    if (counter != null) {
      log('Reuse existing counter', name)

      if (opts.calculate != null) {
        counter.addCalculator(opts.calculate)
      }

      return metrics.get(name)
    }

    log('Register counter', name)
    counter = new PrometheusCounter(name, { registry: this.registry, ...opts })

    metrics.set(name, counter)

    if (opts.calculate == null) {
      return counter
    }
  }

  registerCounterGroup (name: string, opts: PrometheusCalculatedMetricOptions<Record<string, number>>): void
  registerCounterGroup (name: string, opts?: MetricOptions): CounterGroup
  registerCounterGroup (name: string, opts: any = {}): any {
    if (name == null ?? name.trim() === '') {
      throw new Error('Counter group name is required')
    }

    let counterGroup = metrics.get(name)

    if (counterGroup != null) {
      log('Reuse existing counter group', name)

      if (opts.calculate != null) {
        counterGroup.addCalculator(opts.calculate)
      }

      return counterGroup
    }

    log('Register counter group', name)
    counterGroup = new PrometheusCounterGroup(name, { registry: this.registry, ...opts })

    metrics.set(name, counterGroup)

    if (opts.calculate == null) {
      return counterGroup
    }
  }
}

export function prometheusMetrics (init?: Partial<PrometheusMetricsInit>): () => Metrics {
  return () => {
    return new PrometheusMetrics(init)
  }
}
