import { type CollectFunction, Histogram as PromHistogram } from 'prom-client'
import { normaliseString, type CalculatedMetric } from './utils.js'
import type { PrometheusCalculatedHistogramOptions } from './index.js'
import type { CalculateMetric, HistogramGroup, StopTimer } from '@libp2p/interface'

export class PrometheusHistogramGroup implements HistogramGroup, CalculatedMetric<Record<string, number>> {
  private readonly histogram: PromHistogram
  private readonly label: string
  private readonly calculators: Array<CalculateMetric<Record<string, number>>>

  constructor (name: string, opts: PrometheusCalculatedHistogramOptions<Record<string, number>>) {
    name = normaliseString(name)
    const help = normaliseString(opts.help ?? name)
    const label = this.label = normaliseString(opts.label ?? name)
    let collect: CollectFunction<PromHistogram<any>> | undefined
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

    this.histogram = new PromHistogram({
      name,
      help,
      buckets: opts.buckets ?? [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
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
