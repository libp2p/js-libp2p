import type { StopTimer, Summary } from '@libp2p/interface'
import type { Gauge } from '@opentelemetry/api'

export class OpenTelemetrySummary implements Summary {
  private readonly gauge: Gauge

  constructor (gauge: Gauge) {
    this.gauge = gauge
  }

  observe (value: number): void {
    this.gauge.record(value)
  }

  reset (): void {
    this.gauge.record(0)
  }

  timer (): StopTimer {
    const start = Date.now()

    return () => {
      this.observe(Date.now() - start)
    }
  }
}
