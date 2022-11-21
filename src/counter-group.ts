import type { CounterGroup, CalculateMetric } from '@libp2p/interface-metrics'
import { Counter as PromCounter, CollectFunction } from 'prom-client'
import { normaliseString, CalculatedMetric } from './utils.js'
import type { PrometheusCalculatedMetricOptions } from './index.js'

export class PrometheusCounterGroup implements CounterGroup, CalculatedMetric<Record<string, number>> {
  private readonly counter: PromCounter
  private readonly label: string
  private readonly calculators: Array<CalculateMetric<Record<string, number>>>

  constructor (name: string, opts: PrometheusCalculatedMetricOptions<Record<string, number>>) {
    name = normaliseString(name)
    const help = normaliseString(opts.help ?? name)
    const label = this.label = normaliseString(opts.label ?? name)
    let collect: CollectFunction<PromCounter<any>> | undefined
    this.calculators = []

    // calculated metric
    if (opts?.calculate != null) {
      this.calculators.push(opts.calculate)
      const self = this

      collect = async function () {
        await Promise.all(self.calculators.map(async calculate => {
          const values = await calculate()

          Object.entries(values).forEach(([key, value]) => {
            this.inc({ [label]: key }, value)
          })
        }))
      }
    }

    this.counter = new PromCounter({
      name,
      help,
      labelNames: [this.label],
      registers: opts.registry !== undefined ? [opts.registry] : undefined,
      collect
    })
  }

  addCalculator (calculator: CalculateMetric<Record<string, number>>) {
    this.calculators.push(calculator)
  }

  increment (values: Record<string, number | unknown>): void {
    Object.entries(values).forEach(([key, value]) => {
      const inc = typeof value === 'number' ? value : 1

      this.counter.inc({ [this.label]: key }, inc)
    })
  }

  reset (): void {
    this.counter.reset()
  }
}
