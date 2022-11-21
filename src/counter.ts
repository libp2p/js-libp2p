import type { Counter } from '@libp2p/interface-metrics'
import { CollectFunction, Counter as PromCounter } from 'prom-client'
import type { PrometheusCalculatedMetricOptions } from './index.js'
import { normaliseString } from './utils.js'

export class PrometheusCounter implements Counter {
  private readonly counter: PromCounter

  constructor (name: string, opts: PrometheusCalculatedMetricOptions) {
    name = normaliseString(name)
    const help = normaliseString(opts.help ?? name)
    const labels = opts.label != null ? [normaliseString(opts.label)] : []
    let collect: CollectFunction<PromCounter<any>> | undefined

    // calculated metric
    if (opts?.calculate != null) {
      const calculate = opts.calculate

      collect = async function () {
        const value = await calculate()

        this.inc(value)
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

  increment (value: number = 1): void {
    this.counter.inc(value)
  }

  reset (): void {
    this.counter.reset()
  }
}
