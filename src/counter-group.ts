import type { CounterGroup, CalculatedMetricOptions, CalculateMetric } from '@libp2p/interface-metrics'
import { Counter as PromCounter, CollectFunction } from 'prom-client'
import { normaliseString } from './utils.js'

export class PrometheusCounterGroup implements CounterGroup {
  private readonly counter: PromCounter
  private readonly label: string

  constructor (name: string, opts: CalculatedMetricOptions<Record<string, number | bigint>>) {
    name = normaliseString(name)
    const help = normaliseString(opts.help ?? name)
    const label = this.label = normaliseString(opts.label ?? name)
    let collect: CollectFunction<PromCounter<any>> | undefined

    // calculated metric
    if (opts?.calculate != null) {
      const calculate: CalculateMetric<Record<string, number | bigint>> = opts.calculate

      collect = async function () {
        const values = await calculate()

        Object.entries(values).forEach(([key, value]) => {
          // prom-client does not support bigints for values
          // https://github.com/siimon/prom-client/issues/259
          this.inc({ [label]: key }, Number(value))
        })
      }
    }

    this.counter = new PromCounter({
      name,
      help,
      labelNames: [this.label],
      collect
    })
  }

  increment (values: Record<string, number | bigint | unknown>): void {
    Object.entries(values).forEach(([key, value]) => {
      // prom-client does not support bigints for values
      // https://github.com/siimon/prom-client/issues/259
      const inc = typeof value === 'number' || typeof value === 'bigint' ? Number(value) : 1

      this.counter.inc({ [this.label]: key }, inc)
    })
  }

  reset (): void {
    this.counter.reset()
  }
}
