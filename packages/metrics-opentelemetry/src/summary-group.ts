import type { HistogramGroup, StopTimer } from '@libp2p/interface'
import type { Gauge } from '@opentelemetry/api'

export class OpenTelemetrySummaryGroup implements HistogramGroup {
  private readonly label: string
  private readonly gauge: Gauge
  private readonly lastValues: Record<string, number>

  constructor (label: string, gauge: Gauge) {
    this.label = label
    this.gauge = gauge
    this.lastValues = {}
  }

  observe (values: Record<string, number>): void {
    Object.entries(values).forEach(([key, value]) => {
      this.lastValues[key] = value
      this.gauge.record(value, {
        [this.label]: key
      })
    })
  }

  reset (): void {
    Object.keys(this.lastValues).forEach(key => {
      this.lastValues[key] = 0
      this.gauge.record(0, {
        [this.label]: key
      })
    })
  }

  timer (key: string): StopTimer {
    const start = Date.now()

    return () => {
      this.lastValues[key] = Date.now() - start
      this.gauge.record(this.lastValues[key], {
        [this.label]: key
      })
    }
  }
}
