import { Summary as PromSummary } from 'prom-client'
import { normalizeString } from './utils.js'
import type { PrometheusCalculatedSummaryOptions } from './index.js'
import type { StopTimer, Summary } from '@libp2p/interface'
import type { CollectFunction } from 'prom-client'

export class PrometheusSummary implements Summary {
  private readonly summary: PromSummary

  constructor (name: string, opts: PrometheusCalculatedSummaryOptions) {
    name = normalizeString(name)
    const help = normalizeString(opts.help ?? name)
    const labels = opts.label != null ? [normalizeString(opts.label)] : []
    let collect: CollectFunction<PromSummary<any>> | undefined

    // calculated metric
    if (opts?.calculate != null) {
      collect = async function () {
        this.observe(await opts.calculate())
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
