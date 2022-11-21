import type { CalculateMetric, MetricGroup, StopTimer } from '@libp2p/interface-metrics'
import { CollectFunction, Gauge } from 'prom-client'
import type { PrometheusCalculatedMetricOptions } from './index.js'
import { normaliseString } from './utils.js'

export class PrometheusMetricGroup implements MetricGroup {
  private readonly gauge: Gauge
  private readonly label: string

  constructor (name: string, opts: PrometheusCalculatedMetricOptions<Record<string, number>>) {
    name = normaliseString(name)
    const help = normaliseString(opts.help ?? name)
    const label = this.label = normaliseString(opts.label ?? name)
    let collect: CollectFunction<Gauge<any>> | undefined

    // calculated metric
    if (opts?.calculate != null) {
      const calculate: CalculateMetric<Record<string, number>> = opts.calculate

      collect = async function () {
        const values = await calculate()

        Object.entries(values).forEach(([key, value]) => {
          this.set({ [label]: key }, value)
        })
      }
    }

    this.gauge = new Gauge({
      name,
      help,
      labelNames: [this.label],
      registers: opts.registry !== undefined ? [opts.registry] : undefined,
      collect
    })
  }

  update (values: Record<string, number>): void {
    Object.entries(values).forEach(([key, value]) => {
      this.gauge.set({ [this.label]: key }, value)
    })
  }

  increment (values: Record<string, number | unknown>): void {
    Object.entries(values).forEach(([key, value]) => {
      const inc = typeof value === 'number' ? value : 1

      this.gauge.inc({ [this.label]: key }, inc)
    })
  }

  decrement (values: Record<string, number | unknown>): void {
    Object.entries(values).forEach(([key, value]) => {
      const dec = typeof value === 'number' ? value : 1

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
