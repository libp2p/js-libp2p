import { Counter as PromCounter } from 'prom-client'
import { normalizeString } from './utils.js'
import type { PrometheusCalculatedMetricOptions } from './index.js'
import type { Counter } from '@libp2p/interface'
import type { CollectFunction } from 'prom-client'

export class PrometheusCounter implements Counter {
  private readonly counter: PromCounter

  constructor (name: string, opts: PrometheusCalculatedMetricOptions) {
    name = normalizeString(name)
    const help = normalizeString(opts.help ?? name)
    const labels = opts.label != null ? [normalizeString(opts.label)] : []
    let collect: CollectFunction<PromCounter<any>> | undefined

    // calculated metric
    if (opts?.calculate != null) {
      collect = async function () {
        this.inc(await opts.calculate())
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
