import { Counter as PromCounter } from 'prom-client'
import { normalizeString } from './utils.js'
import type { PrometheusCalculatedMetricOptions } from './index.js'
import type { CounterGroup } from '@libp2p/interface'
import type { CollectFunction } from 'prom-client'

export class PrometheusCounterGroup implements CounterGroup {
  private readonly counter: PromCounter
  private readonly label: string

  constructor (name: string, opts: PrometheusCalculatedMetricOptions<Record<string, number>>) {
    name = normalizeString(name)
    const help = normalizeString(opts.help ?? name)
    const label = this.label = normalizeString(opts.label ?? name)
    let collect: CollectFunction<PromCounter<any>> | undefined

    // calculated metric
    if (opts?.calculate != null) {
      collect = async function () {
        const values = await opts.calculate()

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
