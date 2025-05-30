import { Histogram as PromHistogram } from 'prom-client'
import { normalizeString } from './utils.js'
import type { PrometheusCalculatedHistogramOptions } from './index.js'
import type { StopTimer, Histogram } from '@libp2p/interface'
import type { CollectFunction } from 'prom-client'

export class PrometheusHistogram implements Histogram {
  private readonly histogram: PromHistogram

  constructor (name: string, opts: PrometheusCalculatedHistogramOptions) {
    name = normalizeString(name)
    const help = normalizeString(opts.help ?? name)
    const labels = opts.label != null ? [normalizeString(opts.label)] : []
    let collect: CollectFunction<PromHistogram<any>> | undefined

    // calculated metric
    if (opts?.calculate != null) {
      collect = async function () {
        this.observe(await opts.calculate())
      }
    }

    this.histogram = new PromHistogram({
      name,
      help,
      buckets: opts.buckets ?? [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      labelNames: labels,
      registers: opts.registry !== undefined ? [opts.registry] : undefined,
      collect
    })
  }

  observe (value: number): void {
    this.histogram.observe(value)
  }

  reset (): void {
    this.histogram.reset()
  }

  timer (): StopTimer {
    return this.histogram.startTimer()
  }
}
