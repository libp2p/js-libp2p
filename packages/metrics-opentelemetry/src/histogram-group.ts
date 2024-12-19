import type { HistogramGroup, StopTimer } from '@libp2p/interface'
import type { Histogram as OTelHistogram } from '@opentelemetry/api'

export class OpenTelemetryHistogramGroup implements HistogramGroup {
  private readonly label: string
  private readonly histogram: OTelHistogram

  constructor (label: string, histogram: OTelHistogram) {
    this.label = label
    this.histogram = histogram
  }

  observe (values: Record<string, number>): void {
    Object.entries(values).forEach(([key, value]) => {
      this.histogram.record(value, {
        [this.label]: key
      })
    })
  }

  reset (): void {
    this.histogram.record(0)
  }

  timer (key: string): StopTimer {
    const start = Date.now()

    return () => {
      this.histogram.record(Date.now() - start, {
        [this.label]: key
      })
    }
  }
}
