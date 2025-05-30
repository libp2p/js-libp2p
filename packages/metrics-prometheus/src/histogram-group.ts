import { Histogram as PromHistogram } from 'prom-client'
import { normalizeString } from './utils.js'
import type { PrometheusCalculatedHistogramOptions } from './index.js'
import type { HistogramGroup, StopTimer } from '@libp2p/interface'
import type { CollectFunction } from 'prom-client'

export class PrometheusHistogramGroup implements HistogramGroup {
  private readonly histogram: PromHistogram
  private readonly label: string

  constructor (name: string, opts: PrometheusCalculatedHistogramOptions<Record<string, number>>) {
    name = normalizeString(name)
    const help = normalizeString(opts.help ?? name)
    const label = this.label = normalizeString(opts.label ?? name)
    let collect: CollectFunction<PromHistogram<any>> | undefined

    // calculated metric
    if (opts?.calculate != null) {
      collect = async function () {
        const values = await opts.calculate()

        Object.entries(values).forEach(([key, value]) => {
          this.observe({ [label]: key }, value)
        })
      }
    }

    this.histogram = new PromHistogram({
      name,
      help,
      buckets: opts.buckets ?? [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      labelNames: [this.label],
      registers: opts.registry !== undefined ? [opts.registry] : undefined,
      collect
    })
  }

  observe (values: Record<string, number>): void {
    Object.entries(values).forEach(([key, value]) => {
      this.histogram.observe({ [this.label]: key }, value)
    })
  }

  reset (): void {
    this.histogram.reset()
  }

  timer (key: string): StopTimer {
    return this.histogram.startTimer({
      [key]: 0
    })
  }
}
