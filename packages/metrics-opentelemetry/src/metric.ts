import type { Metric, StopTimer } from '@libp2p/interface'
import type { Gauge } from '@opentelemetry/api'

export class OpenTelemetryMetric implements Metric {
  private readonly gauge: Gauge
  private lastValue: number

  constructor (gauge: Gauge) {
    this.gauge = gauge
    this.lastValue = 0
    this.update(0)
  }

  update (value: number): void {
    this.lastValue = value
    this.gauge.record(value, {
      attrName: 'attrValue'
    })
  }

  increment (value: number = 1): void {
    this.lastValue += value
    this.gauge.record(this.lastValue)
  }

  decrement (value: number = 1): void {
    this.lastValue -= value
    this.gauge.record(this.lastValue)
  }

  reset (): void {
    this.gauge.record(0)
    this.lastValue = 0
  }

  timer (): StopTimer {
    const start = Date.now()

    return () => {
      this.lastValue = Date.now() - start
      this.gauge.record(this.lastValue)
    }
  }
}
