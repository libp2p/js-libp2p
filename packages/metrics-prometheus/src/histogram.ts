import { type CollectFunction, Histogram as PromHistogram } from 'prom-client'
import { normaliseString } from './utils.js'
import type { PrometheusCalculatedHistogramOptions } from './index.js'
import type { StopTimer, CalculateMetric, Histogram } from '@libp2p/interface'

export class PrometheusHistogram implements Histogram {
  private readonly histogram: PromHistogram
  private readonly calculators: CalculateMetric[]

  constructor (name: string, opts: PrometheusCalculatedHistogramOptions) {
    name = normaliseString(name)
    const help = normaliseString(opts.help ?? name)
    const labels = opts.label != null ? [normaliseString(opts.label)] : []
    let collect: CollectFunction<PromHistogram<any>> | undefined
    this.calculators = []

    // calculated metric
    if (opts?.calculate != null) {
      this.calculators.push(opts.calculate)
      const self = this

      collect = async function () {
        const values = await Promise.all(self.calculators.map(async calculate => calculate()))
        for (const value of values) {
          this.observe(value)
        }
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

  addCalculator (calculator: CalculateMetric): void {
    this.calculators.push(calculator)
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
