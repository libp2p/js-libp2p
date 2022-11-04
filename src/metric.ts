import type { Metric, MetricOptions, StopTimer } from '@libp2p/interface-metrics'
import { Gauge } from 'prom-client'
import { normaliseString } from './utils.js'

export class PrometheusMetric implements Metric {
  private readonly gauge: Gauge

  constructor (name: string, opts: MetricOptions) {
    name = normaliseString(name)
    const help = normaliseString(opts.help ?? name)
    const label = opts.label != null ? normaliseString(opts.label) : undefined

    this.gauge = new Gauge({
      name,
      help,
      labelNames: label != null ? [label] : []
    })
  }

  update (value: number): void {
    this.gauge.set(value)
  }

  increment (value = 1): void {
    this.gauge.inc(value)
  }

  decrement (value = 1): void {
    this.gauge.dec(value)
  }

  reset (): void {
    this.gauge.reset()
  }

  timer (): StopTimer {
    return this.gauge.startTimer()
  }
}
