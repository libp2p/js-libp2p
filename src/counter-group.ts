import type { CounterGroup, CalculateMetric } from '@libp2p/interface-metrics'
import { Counter as PromCounter, CollectFunction } from 'prom-client'
import type { PrometheusCalculatedMetricOptions } from './index.js'
import { normaliseString } from './utils.js'

export class PrometheusCounterGroup implements CounterGroup {
  private readonly counter: PromCounter
  private readonly label: string

  constructor (name: string, opts: PrometheusCalculatedMetricOptions<Record<string, number>>) {
    name = normaliseString(name)
    const help = normaliseString(opts.help ?? name)
    const label = this.label = normaliseString(opts.label ?? name)
    let collect: CollectFunction<PromCounter<any>> | undefined

    // calculated metric
    if (opts?.calculate != null) {
      const calculate: CalculateMetric<Record<string, number>> = opts.calculate

      collect = async function () {
        const values = await calculate()

        Object.entries(values).forEach(([key, value]) => {
          this.inc({ [label]: key }, value)
        })
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
