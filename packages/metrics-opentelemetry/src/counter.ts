import type { Counter } from '@libp2p/interface'
import type { Counter as OTelCounter } from '@opentelemetry/api'

export class OpenTelemetryCounter implements Counter {
  private readonly counter: OTelCounter

  constructor (counter: OTelCounter) {
    this.counter = counter
  }

  increment (value?: number): void {
    this.counter.add(value ?? 1)
  }

  reset (): void {
    // no-op
  }
}
