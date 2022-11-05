import type { CalculatedMetricOptions, Counter, CounterGroup, Metric, MetricGroup, MetricOptions, Metrics } from '@libp2p/interface-metrics'
import { collectDefaultMetrics, DefaultMetricsCollectorConfiguration, register } from 'prom-client'
import type { MultiaddrConnection, Stream, Connection } from '@libp2p/interface-connection'
import type { Duplex } from 'it-stream-types'
import each from 'it-foreach'
import { PrometheusMetric } from './metric.js'
import { PrometheusMetricGroup } from './metric-group.js'
import { PrometheusCounter } from './counter.js'
import { PrometheusCounterGroup } from './counter-group.js'
import { logger } from '@libp2p/logger'

const log = logger('libp2p:prometheus-metrics')

export interface PrometheusMetricsInit {
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

class PrometheusMetrics implements Metrics {
  private readonly transferStats = new Map<string, bigint>()

  constructor (init?: Partial<PrometheusMetricsInit>) {
    if (init?.preserveExistingMetrics !== true) {
      log('Clearing existing metrics')
      register.clear()
    }

    if (init?.preserveExistingMetrics !== false) {
      log('Collecting default metrics')
      collectDefaultMetrics(init?.defaultMetrics)
    }

    log('Collecting data transfer metrics')
    this.registerCounterGroup('libp2p_data_transfer_bytes_total', {
      label: 'protocol',
      calculate: () => {
        const output: Record<string, number> = {}

        for (const [key, value] of this.transferStats.entries()) {
          // prom-client does not support bigints for values
          // https://github.com/siimon/prom-client/issues/259
          output[key] = Number(value)
        }

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
    const existing = this.transferStats.get(key) ?? 0n

    this.transferStats.set(key, existing + BigInt(value))
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

  registerMetric (name: string, opts: CalculatedMetricOptions): void
  registerMetric (name: string, opts?: MetricOptions): Metric
  registerMetric (name: string, opts: any = {}): any {
    if (name == null ?? name.trim() === '') {
      throw new Error('Metric name is required')
    }

    log('Register metric', name)
    const metric = new PrometheusMetric(name, opts ?? {})

    if (opts.calculate == null) {
      return metric
    }
  }

  registerMetricGroup (name: string, opts: CalculatedMetricOptions<Record<string, number>>): void
  registerMetricGroup (name: string, opts?: MetricOptions): MetricGroup
  registerMetricGroup (name: string, opts: any = {}): any {
    if (name == null ?? name.trim() === '') {
      throw new Error('Metric name is required')
    }

    log('Register metric group', name)
    const group = new PrometheusMetricGroup(name, opts ?? {})

    if (opts.calculate == null) {
      return group
    }
  }

  registerCounter (name: string, opts: CalculatedMetricOptions): void
  registerCounter (name: string, opts?: MetricOptions): Counter
  registerCounter (name: string, opts: any = {}): any {
    if (name == null ?? name.trim() === '') {
      throw new Error('Counter name is required')
    }

    log('Register counter', name)
    const counter = new PrometheusCounter(name, opts)

    if (opts.calculate == null) {
      return counter
    }
  }

  registerCounterGroup (name: string, opts: CalculatedMetricOptions<Record<string, number>>): void
  registerCounterGroup (name: string, opts?: MetricOptions): CounterGroup
  registerCounterGroup (name: string, opts: any = {}): any {
    if (name == null ?? name.trim() === '') {
      throw new Error('Metric name is required')
    }

    log('Register counter group', name)
    const group = new PrometheusCounterGroup(name, opts)

    if (opts.calculate == null) {
      return group
    }
  }
}

export function prometheusMetrics (init?: Partial<PrometheusMetricsInit>): () => Metrics {
  return () => {
    return new PrometheusMetrics(init)
  }
}
