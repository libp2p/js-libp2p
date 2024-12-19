import type { CounterGroup, StopTimer } from '@libp2p/interface'
import type { UpDownCounter as OTelCounter } from '@opentelemetry/api'

export class OpenTelemetryCounterGroup implements CounterGroup {
  private readonly label: string
  private readonly counter: OTelCounter

  constructor (label: string, counter: OTelCounter) {
    this.label = label
    this.counter = counter
  }

  update (values: Record<string, number>): void {
    Object.entries(values).forEach(([key, value]) => {
      this.counter.add(value, {
        [this.label]: key
      })
    })
  }

  increment (values: Record<string, number | true>): void {
    Object.entries(values).forEach(([key, value]) => {
      this.counter.add(value === true ? 1 : value, {
        [this.label]: key
      })
    })
  }

  reset (): void {
    // no-op
  }

  timer (key: string): StopTimer {
    return () => {
      // no-op
    }
  }
}
