import type { Histogram, StopTimer } from '@libp2p/interface'
import type { Histogram as OTelHistogram } from '@opentelemetry/api'

export class OpenTelemetryHistogram implements Histogram {
  private readonly histogram: OTelHistogram

  constructor (histogram: OTelHistogram) {
    this.histogram = histogram
  }

  observe (value: number): void {
    this.histogram.record(value)
  }

  reset (): void {
    this.histogram.record(0)
  }

  timer (): StopTimer {
    const start = Date.now()

    return () => {
      this.observe(Date.now() - start)
    }
  }
}
