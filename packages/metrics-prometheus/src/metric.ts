import { Gauge } from 'prom-client'
import { normalizeString } from './utils.js'
import type { PrometheusCalculatedMetricOptions } from './index.js'
import type { Metric, StopTimer } from '@libp2p/interface'
import type { CollectFunction } from 'prom-client'

export class PrometheusMetric implements Metric {
  private readonly gauge: Gauge

  constructor (name: string, opts: PrometheusCalculatedMetricOptions) {
    name = normalizeString(name)
    const help = normalizeString(opts.help ?? name)
    const labels = opts.label != null ? [normalizeString(opts.label)] : []
    let collect: CollectFunction<Gauge<any>> | undefined

    // calculated metric
    if (opts?.calculate != null) {
      collect = async function () {
        this.set(await opts.calculate())
      }
    }

    this.gauge = new Gauge({
      name,
      help,
      labelNames: labels,
      registers: opts.registry !== undefined ? [opts.registry] : undefined,
      collect
    })
  }

  update (value: number): void {
    this.gauge.set(value)
  }

  increment (value: number = 1): void {
    this.gauge.inc(value)
  }

  decrement (value: number = 1): void {
    this.gauge.dec(value)
  }

  reset (): void {
    this.gauge.reset()
  }

  timer (): StopTimer {
    return this.gauge.startTimer()
  }
}
