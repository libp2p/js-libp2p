import type { CalculatedMetricOptions, CalculateMetric, MetricGroup, StopTimer } from '@libp2p/interface-metrics'
import { CollectFunction, Gauge } from 'prom-client'
import { normaliseString } from './utils.js'

export class PrometheusMetricGroup implements MetricGroup {
  private readonly gauge: Gauge
  private readonly label: string

  constructor (name: string, opts: CalculatedMetricOptions<Record<string, number | bigint>>) {
    name = normaliseString(name)
    const help = normaliseString(opts.help ?? name)
    const label = this.label = normaliseString(opts.label ?? name)
    let collect: CollectFunction<Gauge<any>> | undefined

    // calculated metric
    if (opts?.calculate != null) {
      const calculate: CalculateMetric<Record<string, number | bigint>> = opts.calculate

      collect = async function () {
        const values = await calculate()

        Object.entries(values).forEach(([key, value]) => {
          // prom-client does not support bigints for values
          // https://github.com/siimon/prom-client/issues/259
          this.set({ [label]: key }, Number(value))
        })
      }
    }

    this.gauge = new Gauge({
      name,
      help,
      labelNames: [this.label],
      collect
    })
  }

  update (values: Record<string, number | bigint>): void {
    Object.entries(values).forEach(([key, value]) => {
      // prom-client does not support bigints for values
      // https://github.com/siimon/prom-client/issues/259
      this.gauge.set({ [this.label]: key }, Number(value))
    })
  }

  increment (values: Record<string, number | bigint | unknown>): void {
    Object.entries(values).forEach(([key, value]) => {
      // prom-client does not support bigints for values
      // https://github.com/siimon/prom-client/issues/259
      const inc = typeof value === 'number' || typeof value === 'bigint' ? Number(value) : 1

      this.gauge.inc({ [this.label]: key }, inc)
    })
  }

  decrement (values: Record<string, number | unknown>): void {
    Object.entries(values).forEach(([key, value]) => {
      // prom-client does not support bigints for values
      // https://github.com/siimon/prom-client/issues/259
      const dec = typeof value === 'number' || typeof value === 'bigint' ? Number(value) : 1

      this.gauge.dec({ [this.label]: key }, dec)
    })
  }

  reset (): void {
    this.gauge.reset()
  }

  timer (key: string): StopTimer {
    return this.gauge.startTimer({
      key: 0
    })
  }
}
