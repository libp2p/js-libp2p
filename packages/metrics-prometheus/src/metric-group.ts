import { type CollectFunction, Gauge } from 'prom-client'
import { normalizeString, type CalculatedMetric } from './utils.js'
import type { PrometheusCalculatedMetricOptions } from './index.js'
import type { CalculateMetric, MetricGroup, StopTimer } from '@libp2p/interface'

export class PrometheusMetricGroup implements MetricGroup, CalculatedMetric<Record<string, number>> {
  private readonly gauge: Gauge
  private readonly label: string
  private readonly calculators: Array<CalculateMetric<Record<string, number>>>

  constructor (name: string, opts: PrometheusCalculatedMetricOptions<Record<string, number>>) {
    name = normalizeString(name)
    const help = normalizeString(opts.help ?? name)
    const label = this.label = normalizeString(opts.label ?? name)
    let collect: CollectFunction<Gauge<any>> | undefined
    this.calculators = []

    // calculated metric
    if (opts?.calculate != null) {
      this.calculators.push(opts.calculate)
      const self = this

      collect = async function () {
        await Promise.all(self.calculators.map(async calculate => {
          const values = await calculate()

          Object.entries(values).forEach(([key, value]) => {
            this.set({ [label]: key }, value)
          })
        }))
      }
    }

    this.gauge = new Gauge({
      name,
      help,
      labelNames: [this.label],
      registers: opts.registry !== undefined ? [opts.registry] : undefined,
      collect
    })
  }

  addCalculator (calculator: CalculateMetric<Record<string, number>>): void {
    this.calculators.push(calculator)
  }

  update (values: Record<string, number>): void {
    Object.entries(values).forEach(([key, value]) => {
      this.gauge.set({ [this.label]: key }, value)
    })
  }

  increment (values: Record<string, number | unknown>): void {
    Object.entries(values).forEach(([key, value]) => {
      const inc = typeof value === 'number' ? value : 1

      this.gauge.inc({ [this.label]: key }, inc)
    })
  }

  decrement (values: Record<string, number | unknown>): void {
    Object.entries(values).forEach(([key, value]) => {
      const dec = typeof value === 'number' ? value : 1

      this.gauge.dec({ [this.label]: key }, dec)
    })
  }

  reset (): void {
    this.gauge.reset()
  }

  timer (key: string): StopTimer {
    return this.gauge.startTimer({
      [this.label]: key
    })
  }
}
