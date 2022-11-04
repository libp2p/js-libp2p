import type { CalculatedMetricOptions, CalculateMetric, Metric, MetricGroup, MetricOptions, Metrics } from '@libp2p/interface-metrics'
import type { Startable } from '@libp2p/interfaces/startable'
import { Gauge, CollectFunction, collectDefaultMetrics, DefaultMetricsCollectorConfiguration, register } from 'prom-client'
import { PrometheusMetric } from './metric.js'
import { PrometheusMetricGroup } from './metric-group.js'
import { DefaultMetrics, DefaultMetricsInit } from '@libp2p/metrics'

export interface PrometheusMetricsInit extends DefaultMetricsInit {
  defaultMetrics?: DefaultMetricsCollectorConfiguration
  preserveExistingMetrics?: boolean
  collectDefaultMetrics?: boolean
}

class PrometheusMetrics extends DefaultMetrics implements Metrics, Startable {
  constructor (init?: Partial<PrometheusMetricsInit>) {
    super(init)

    if (init?.preserveExistingMetrics !== true) {
      // all metrics in prometheus are global so it's necessary to remove
      // existing metrics to make sure we don't error when setting up metrics
      register.clear()
    }

    if (init?.preserveExistingMetrics !== false) {
      // collect memory/CPU and node-specific default metrics
      collectDefaultMetrics(init?.defaultMetrics)
    }

    this.registerMetricGroup('libp2p_data_transfer_bytes', {
      label: 'protocol',
      calculate: () => {
        const output: Record<string, number> = {}

        const global = this.getGlobal().getSnapshot()
        output['global sent'] = Number(global.dataSent)
        output['global received'] = Number(global.dataReceived)

        for (const protocol of this.getProtocols()) {
          const stats = this.forProtocol(protocol)

          if (stats == null) {
            continue
          }

          const snapshot = stats.getSnapshot()
          output[`${protocol} sent`] = Number(snapshot.dataSent)
          output[`${protocol} received`] = Number(snapshot.dataReceived)
        }

        return output
      }
    })

    this.registerMetricGroup('nodejs_memory_usage_bytes', {
      label: 'memory',
      calculate: () => {
        return {
          ...process.memoryUsage()
        }
      }
    })
  }

  registerMetric (name: string, opts: CalculatedMetricOptions): void
  registerMetric (name: string, opts?: MetricOptions): Metric
  registerMetric (name: string, opts: any): any {
    if (name == null ?? name.trim() === '') {
      throw new Error('Metric name is required')
    }

    if (opts?.calculate != null) {
      const calculate = opts.calculate

      // calculated metric
      const collect: CollectFunction<Gauge<any>> = async function () {
        const value = await calculate()

        this.set(value)
      }

      // prom-client metrics are global
      new Gauge({ // eslint-disable-line no-new
        name,
        help: opts.help ?? name,
        labelNames: [opts.label ?? name],
        collect
      })

      return
    }

    return new PrometheusMetric(name, opts ?? {})
  }

  registerMetricGroup (name: string, opts: CalculatedMetricOptions<Record<string, number>>): void
  registerMetricGroup (name: string, opts?: MetricOptions): MetricGroup
  registerMetricGroup (name: string, opts: any): any {
    if (name == null ?? name.trim() === '') {
      throw new Error('Metric name is required')
    }

    if (opts?.calculate != null) {
      // calculated metric
      const calculate: CalculateMetric<Record<string, number>> = opts.calculate
      const label = opts.label ?? name

      // calculated metric
      const collect: CollectFunction<Gauge<any>> = async function () {
        const values = await calculate()

        Object.entries(values).forEach(([key, value]) => {
          this.set({ [label]: key }, value)
        })
      }

      // prom-client metrics are global
      new Gauge({ // eslint-disable-line no-new
        name,
        help: opts.help ?? name,
        labelNames: [opts.label ?? name],
        collect
      })

      return
    }

    return new PrometheusMetricGroup(name, opts ?? {})
  }
}

export function prometheusMetrics (init?: Partial<PrometheusMetricsInit>): () => Metrics {
  return () => {
    return new PrometheusMetrics(init)
  }
}
