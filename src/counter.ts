import { type CollectFunction, Counter as PromCounter } from 'prom-client'
import { normaliseString, type CalculatedMetric } from './utils.js'
import type { PrometheusCalculatedMetricOptions } from './index.js'
import type { CalculateMetric, Counter } from '@libp2p/interface-metrics'

export class PrometheusCounter implements Counter, CalculatedMetric {
  private readonly counter: PromCounter
  private readonly calculators: CalculateMetric[]

  constructor (name: string, opts: PrometheusCalculatedMetricOptions) {
    name = normaliseString(name)
    const help = normaliseString(opts.help ?? name)
    const labels = opts.label != null ? [normaliseString(opts.label)] : []
    let collect: CollectFunction<PromCounter<any>> | undefined
    this.calculators = []

    // calculated metric
    if (opts?.calculate != null) {
      this.calculators.push(opts.calculate)
      const self = this

      collect = async function () {
        const values = await Promise.all(self.calculators.map(async calculate => calculate()))
        const sum = values.reduce((acc, curr) => acc + curr, 0)

        this.inc(sum)
      }
    }

    this.counter = new PromCounter({
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

  increment (value: number = 1): void {
    this.counter.inc(value)
  }

  reset (): void {
    this.counter.reset()
  }
}
