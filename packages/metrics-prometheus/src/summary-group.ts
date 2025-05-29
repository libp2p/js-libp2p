import { Summary as PromSummary } from 'prom-client'
import { normalizeString } from './utils.js'
import type { PrometheusCalculatedSummaryOptions } from './index.js'
import type { SummaryGroup, StopTimer } from '@libp2p/interface'
import type { CollectFunction } from 'prom-client'

export class PrometheusSummaryGroup implements SummaryGroup {
  private readonly summary: PromSummary
  private readonly label: string

  constructor (name: string, opts: PrometheusCalculatedSummaryOptions<Record<string, number>>) {
    name = normalizeString(name)
    const help = normalizeString(opts.help ?? name)
    const label = this.label = normalizeString(opts.label ?? name)
    let collect: CollectFunction<PromSummary<any>> | undefined

    // calculated metric
    if (opts?.calculate != null) {
      collect = async function () {
        const values = await opts.calculate()

        Object.entries(values).forEach(([key, value]) => {
          this.observe({ [label]: key }, value)
        })
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
