import { type CollectFunction, Summary as PromSummary } from 'prom-client'
import { normaliseString, type CalculatedMetric } from './utils.js'
import type { PrometheusCalculatedSummaryOptions } from './index.js'
import type { CalculateMetric, SummaryGroup, StopTimer } from '@libp2p/interface'

export class PrometheusSummaryGroup implements SummaryGroup, CalculatedMetric<Record<string, number>> {
  private readonly summary: PromSummary
  private readonly label: string
  private readonly calculators: Array<CalculateMetric<Record<string, number>>>

  constructor (name: string, opts: PrometheusCalculatedSummaryOptions<Record<string, number>>) {
    name = normaliseString(name)
    const help = normaliseString(opts.help ?? name)
    const label = this.label = normaliseString(opts.label ?? name)
    let collect: CollectFunction<PromSummary<any>> | undefined
    this.calculators = []

    // calculated metric
    if (opts?.calculate != null) {
      this.calculators.push(opts.calculate)
      const self = this

      collect = async function () {
        await Promise.all(self.calculators.map(async calculate => {
          const values = await calculate()

          Object.entries(values).forEach(([key, value]) => {
            this.observe({ [label]: key }, value)
          })
        }))
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
      labelNames: [this.label],
      registers: opts.registry !== undefined ? [opts.registry] : undefined,
      collect
    })
  }

  addCalculator (calculator: CalculateMetric<Record<string, number>>): void {
    this.calculators.push(calculator)
  }

  observe (values: Record<string, number>): void {
    Object.entries(values).forEach(([key, value]) => {
      this.summary.observe({ [this.label]: key }, value)
    })
  }

  reset (): void {
    this.summary.reset()
  }

  timer (key: string): StopTimer {
    return this.summary.startTimer({
      [key]: 0
    })
  }
}
