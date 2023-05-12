import { type CollectFunction, Gauge } from 'prom-client'
import { normaliseString } from './utils.js'
import type { PrometheusCalculatedMetricOptions } from './index.js'
import type { Metric, StopTimer, CalculateMetric } from '@libp2p/interface-metrics'

export class PrometheusMetric implements Metric {
  private readonly gauge: Gauge
  private readonly calculators: CalculateMetric[]

  constructor (name: string, opts: PrometheusCalculatedMetricOptions) {
    name = normaliseString(name)
    const help = normaliseString(opts.help ?? name)
    const labels = opts.label != null ? [normaliseString(opts.label)] : []
    let collect: CollectFunction<Gauge<any>> | undefined
    this.calculators = []

    // calculated metric
    if (opts?.calculate != null) {
      this.calculators.push(opts.calculate)
      const self = this

      collect = async function () {
        const values = await Promise.all(self.calculators.map(async calculate => calculate()))
        const sum = values.reduce((acc, curr) => acc + curr, 0)

        this.set(sum)
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

  addCalculator (calculator: CalculateMetric): void {
    this.calculators.push(calculator)
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
