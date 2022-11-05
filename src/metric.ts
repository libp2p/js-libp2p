import type { Metric, CalculatedMetricOptions, StopTimer } from '@libp2p/interface-metrics'
import { CollectFunction, Gauge } from 'prom-client'
import { normaliseString } from './utils.js'

export class PrometheusMetric implements Metric {
  private readonly gauge: Gauge

  constructor (name: string, opts: CalculatedMetricOptions) {
    name = normaliseString(name)
    const help = normaliseString(opts.help ?? name)
    const labels = opts.label ? [normaliseString(opts.label)] : []
    let collect: CollectFunction<Gauge<any>> | undefined

    // calculated metric
    if (opts?.calculate != null) {
      const calculate = opts.calculate

      collect = async function () {
        const value = await calculate()

        // prom-client does not support bigints for values
        // https://github.com/siimon/prom-client/issues/259
        this.set(Number(value))
      }
    }

    this.gauge = new Gauge({
      name,
      help,
      labelNames: labels,
      collect
    })
  }

  update (value: number | bigint): void {
    // prom-client does not support bigints for values
    // https://github.com/siimon/prom-client/issues/259
    this.gauge.set(Number(value))
  }

  increment (value: number | bigint = 1): void {
    // prom-client does not support bigints for values
    // https://github.com/siimon/prom-client/issues/259
    this.gauge.inc(Number(value))
  }

  decrement (value: number | bigint = 1): void {
    // prom-client does not support bigints for values
    // https://github.com/siimon/prom-client/issues/259
    this.gauge.dec(Number(value))
  }

  reset (): void {
    this.gauge.reset()
  }

  timer (): StopTimer {
    return this.gauge.startTimer()
  }
}
