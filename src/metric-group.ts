import type { MetricOptions, MetricGroup, StopTimer } from '@libp2p/interface-metrics'
import { Gauge } from 'prom-client'
import { normaliseString } from './utils.js'

export class PrometheusMetricGroup implements MetricGroup {
  private readonly gauge: Gauge
  private readonly label: string

  constructor (name: string, opts: MetricOptions) {
    name = normaliseString(name)
    const help = normaliseString(opts.help ?? name)
    this.label = normaliseString(opts.label ?? name)

    this.gauge = new Gauge({
      name,
      help,
      labelNames: [this.label]
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
