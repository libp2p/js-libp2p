import type { Metric, CalculatedMetricOptions, StopTimer } from '@libp2p/interface-metrics'
import { CollectFunction, Gauge } from 'prom-client'
import { normaliseString } from './utils.js'

export class PrometheusMetric implements Metric {
  private readonly gauge: Gauge

  constructor (name: string, opts: CalculatedMetricOptions) {
    name = normaliseString(name)
    const help = normaliseString(opts.help ?? name)
    const labels = opts.label != null ? [normaliseString(opts.label)] : []
    let collect: CollectFunction<Gauge<any>> | undefined

    // calculated metric
    if (opts?.calculate != null) {
      const calculate = opts.calculate

      collect = async function () {
        const value = await calculate()

        this.set(value)
      }
    }

    this.gauge = new Gauge({
      name,
      help,
      labelNames: labels,
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
