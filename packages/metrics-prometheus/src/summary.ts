import { type CollectFunction, Summary as PromSummary } from 'prom-client'
import { normaliseString } from './utils.js'
import type { PrometheusCalculatedSummaryOptions } from './index.js'
import type { StopTimer, CalculateMetric, Summary } from '@libp2p/interface'

export class PrometheusSummary implements Summary {
  private readonly summary: PromSummary
  private readonly calculators: CalculateMetric[]

  constructor (name: string, opts: PrometheusCalculatedSummaryOptions) {
    name = normaliseString(name)
    const help = normaliseString(opts.help ?? name)
    const labels = opts.label != null ? [normaliseString(opts.label)] : []
    let collect: CollectFunction<PromSummary<any>> | undefined
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

    this.summary = new PromSummary({
      name,
      help,
      percentiles: opts.percentiles ?? [0.01, 0.05, 0.5, 0.9, 0.95, 0.99, 0.999],
      maxAgeSeconds: opts.maxAgeSeconds,
      ageBuckets: opts.ageBuckets,
      pruneAgedBuckets: opts.pruneAgedBuckets,
      compressCount: opts.compressCount ?? 1000,
      labelNames: labels,
      registers: opts.registry !== undefined ? [opts.registry] : undefined,
      collect
    })
  }

  addCalculator (calculator: CalculateMetric): void {
    this.calculators.push(calculator)
  }

  observe (value: number): void {
    this.summary.observe(value)
  }

  reset (): void {
    this.summary.reset()
  }

  timer (): StopTimer {
    return this.summary.startTimer()
  }
}
