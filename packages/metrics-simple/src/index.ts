/**
 * @packageDocumentation
 *
 * Stores metrics in memory and periodically invokes a configured callback to
 * receive them.
 *
 * @example
 *
 * ```ts
 * import { createLibp2p } from 'libp2p'
 * import { simpleMetrics } from '@libp2p/simple-metrics'
 *
 * const node = await createLibp2p({
 *   // ... other options
 *   metrics: simpleMetrics({
 *     onMetrics: (metrics) => {
 *       // do something with metrics
 *     }
 *   }),
 *   intervalMs: 1000 // default 1s
 * })
 *
 * ```
 */

import { serviceCapabilities } from '@libp2p/interface'
import { logger } from '@libp2p/logger'
import { TDigest } from 'tdigest'
import type { Startable, MultiaddrConnection, Stream, Metric, MetricGroup, StopTimer, Metrics, CalculatedMetricOptions, MetricOptions, Counter, CounterGroup, CalculateMetric, Histogram, HistogramOptions, HistogramGroup, Summary, SummaryOptions, SummaryGroup, CalculatedHistogramOptions, CalculatedSummaryOptions, ComponentLogger, Logger, MessageStream } from '@libp2p/interface'

const log = logger('libp2p:simple-metrics')

class SimpleMetric implements Metric {
  private value: number = 0
  private readonly calculate?: CalculateMetric

  constructor (opts?: CalculatedMetricOptions) {
    this.calculate = opts?.calculate
  }

  async collect (): Promise<number> {
    if (this.calculate != null) {
      return this.calculate()
    }

    return this.value
  }

  update (value: number): void {
    this.value = value
  }

  increment (value: number = 1): void {
    this.value += value
  }

  decrement (value: number = 1): void {
    this.value -= value
  }

  reset (): void {
    this.value = 0
  }

  timer (): StopTimer {
    const start = Date.now()

    return () => {
      this.value = Date.now() - start
    }
  }
}

class SimpleGroupMetric implements MetricGroup {
  private values: Record<string, number> = {}
  private readonly calculate?: CalculateMetric<Record<string, number>>

  constructor (opts?: CalculatedMetricOptions<Record<string, number>>) {
    this.calculate = opts?.calculate
  }

  async collect (): Promise<Record<string, number>> {
    if (this.calculate != null) {
      return this.calculate()
    }

    return this.values
  }

  update (values: Record<string, number>): void {
    Object.entries(values).forEach(([key, value]) => {
      this.values[key] = value
    })
  }

  increment (values: Record<string, number | unknown>): void {
    Object.entries(values).forEach(([key, value]) => {
      this.values[key] = this.values[key] ?? 0
      const inc = typeof value === 'number' ? value : 1

      this.values[key] += Number(inc)
    })
  }

  decrement (values: Record<string, number | unknown>): void {
    Object.entries(values).forEach(([key, value]) => {
      this.values[key] = this.values[key] ?? 0
      const dec = typeof value === 'number' ? value : 1

      this.values[key] -= Number(dec)
    })
  }

  reset (): void {
    this.values = {}
  }

  timer (key: string): StopTimer {
    const start = Date.now()

    return () => {
      this.values[key] = Date.now() - start
    }
  }
}

class SimpleHistogram implements Histogram {
  private bucketValues = new Map<number, number>()
  private countValue: number = 0
  private sumValue: number = 0
  private readonly calculate?: CalculateMetric

  constructor (opts?: CalculatedHistogramOptions) {
    const buckets = [
      ...(opts?.buckets ?? [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]),
      Infinity
    ]
    for (const bucket of buckets) {
      this.bucketValues.set(bucket, 0)
    }
    this.calculate = opts?.calculate
  }

  public async collect (): Promise<{ count: number, sum: number, buckets: Record<number, number> }> {
    if (this.calculate != null) {
      this.observe(await this.calculate())
    }

    return {
      count: this.countValue,
      sum: this.sumValue,
      buckets: { ...this.bucketValues }
    }
  }

  observe (value: number): void {
    this.countValue++
    this.sumValue += value

    for (const [bucket, count] of this.bucketValues.entries()) {
      if (value <= bucket) {
        this.bucketValues.set(bucket, count + 1)
      }
    }
  }

  reset (): void {
    this.countValue = 0
    this.sumValue = 0
    for (const bucket of this.bucketValues.keys()) {
      this.bucketValues.set(bucket, 0)
    }
  }

  timer (): StopTimer {
    const start = Date.now()

    return () => {
      this.observe(Date.now() - start)
    }
  }
}

class SimpleHistogramGroup implements HistogramGroup {
  public histograms: Record<string, SimpleHistogram> = {}
  private readonly calculate?: CalculateMetric

  constructor (opts?: CalculatedHistogramOptions) {
    this.histograms = {}
    this.calculate = opts?.calculate
  }

  public async collect (): Promise<Record<string, { count: number, sum: number, buckets: Record<number, number> }>> {
    const output: Record<string, { count: number, sum: number, buckets: Record<number, number> }> = {}

    for (const [key, histogram] of Object.entries(this.histograms)) {
      output[key] = await histogram.collect()
    }

    return output
  }

  observe (values: Partial<Record<string, number>>): void {
    for (const [key, value] of Object.entries(values) as Array<[string, number]>) {
      if (this.histograms[key] === undefined) {
        this.histograms[key] = new SimpleHistogram()
      }

      this.histograms[key].observe(value)
    }
  }

  reset (): void {
    for (const histogram of Object.values(this.histograms)) {
      histogram.reset()
    }
  }

  timer (key: string): StopTimer {
    const start = Date.now()

    return () => {
      this.observe({ [key]: Date.now() - start })
    }
  }
}

class SimpleSummary implements Summary {
  public sumValue: number = 0
  public countValue: number = 0
  public percentiles: number[]
  public tdigest = new TDigest(0.01)
  private readonly compressCount: number
  private readonly calculate?: CalculateMetric

  constructor (opts?: CalculatedSummaryOptions) {
    this.percentiles = opts?.percentiles ?? [0.01, 0.05, 0.5, 0.9, 0.95, 0.99, 0.999]
    this.compressCount = opts?.compressCount ?? 1000
    this.calculate = opts?.calculate
  }

  public async collect (): Promise<{ count: number, sum: number, percentiles: Record<string, number> }> {
    if (this.calculate != null) {
      this.observe(await this.calculate())
    }

    return {
      count: this.countValue,
      sum: this.sumValue,
      percentiles: Object.fromEntries(this.percentiles.map(p => [p, this.tdigest.percentile(p)]))
    }
  }

  observe (value: number): void {
    this.sumValue += value
    this.countValue++

    this.tdigest.push(value)
    if (this.tdigest.size() > this.compressCount) {
      this.tdigest.compress()
    }
  }

  reset (): void {
    this.sumValue = 0
    this.countValue = 0

    this.tdigest.reset()
  }

  timer (): StopTimer {
    const start = Date.now()

    return () => {
      this.observe(Date.now() - start)
    }
  }
}

class SimpleSummaryGroup implements SummaryGroup {
  public summaries: Record<string, SimpleSummary> = {}
  private readonly opts?: CalculatedSummaryOptions

  constructor (opts?: CalculatedSummaryOptions) {
    this.summaries = {}
    this.opts = opts
  }

  public async collect (): Promise<Record<string, { count: number, sum: number, percentiles: Record<string, number> }>> {
    return {
      ...Object.fromEntries(Object.entries(this.summaries).map(([key, summary]) => {
        return [key, {
          count: summary.countValue,
          sum: summary.sumValue,
          percentiles: Object.fromEntries(summary.percentiles.map(p => [p, summary.tdigest.percentile(p)]))
        }]
      }))
    }
  }

  observe (values: Record<string, number>): void {
    for (const [key, value] of Object.entries(values)) {
      if (this.summaries[key] === undefined) {
        this.summaries[key] = new SimpleSummary(this.opts)
      }

      this.summaries[key].observe(value)
    }
  }

  reset (): void {
    for (const summary of Object.values(this.summaries)) {
      summary.reset()
    }
  }

  timer (key: string): StopTimer {
    const start = Date.now()

    return () => {
      this.observe({ [key]: Date.now() - start })
    }
  }
}

export interface OnMetrics { (metrics: Record<string, any>): void }

export interface SimpleMetricsInit {
  /**
   * How often to invoke the onMetrics callback
   */
  intervalMs?: number

  /**
   * A callback periodically invoked with collected metrics
   */
  onMetrics: OnMetrics
}

export interface SimpleMetricsComponents {
  logger: ComponentLogger
}

class SimpleMetrics implements Metrics, Startable {
  public metrics = new Map<string, SimpleMetric | SimpleGroupMetric | SimpleHistogram | SimpleHistogramGroup | SimpleSummary | SimpleSummaryGroup>()
  private readonly transferStats: Map<string, number>
  private started: boolean
  private interval?: ReturnType<typeof setInterval>
  private readonly intervalMs: number
  private readonly onMetrics: OnMetrics
  private readonly log: Logger

  constructor (components: SimpleMetricsComponents, init: SimpleMetricsInit) {
    this.log = components.logger.forComponent('libp2p:simple-metrics')
    this.started = false

    this._emitMetrics = this._emitMetrics.bind(this)

    this.intervalMs = init.intervalMs ?? 1000
    this.onMetrics = init.onMetrics

    // holds global and per-protocol sent/received stats
    this.transferStats = new Map()
  }

  readonly [Symbol.toStringTag] = '@libp2p/metrics-simple'

  readonly [serviceCapabilities]: string[] = [
    '@libp2p/metrics'
  ]

  isStarted (): boolean {
    return this.started
  }

  start (): void {
    this.started = true

    this.interval = setInterval(this._emitMetrics, this.intervalMs)
  }

  stop (): void {
    this.started = false

    clearInterval(this.interval)
    this.transferStats.clear()
  }

  private _emitMetrics (): void {
    Promise.resolve().then(async () => {
      const output: Record<string, any> = {}

      for (const [name, metric] of this.metrics.entries()) {
        output[name] = await metric.collect()
      }

      this.onMetrics(structuredClone(output))
    })
      .catch(err => {
        log.error('could not invoke onMetrics callback - %e', err)
      })
  }

  /**
   * Increment the transfer stat for the passed key, making sure
   * it exists first
   */
  _incrementValue (key: string, value: number): void {
    const existing = this.transferStats.get(key) ?? 0

    this.transferStats.set(key, existing + value)
  }

  /**
   * Override the sink/source of the stream to count the bytes
   * in and out
   */
  _track (stream: MessageStream, name: string): void {
    stream.addEventListener('message', (evt) => {
      this._incrementValue(`${name} received`, evt.data.byteLength)
    })

    const send = stream.send.bind(stream)
    stream.send = (buf) => {
      this._incrementValue(`${name} sent`, buf.byteLength)

      return send(buf)
    }
  }

  trackMultiaddrConnection (maConn: MultiaddrConnection): void {
    this._track(maConn, 'global')
  }

  trackProtocolStream (stream: Stream): void {
    if (stream.protocol == null) {
      // protocol not negotiated yet, should not happen as the upgrader
      // calls this handler after protocol negotiation
      return
    }

    this._track(stream, stream.protocol)
  }

  registerMetric (name: string, opts: CalculatedMetricOptions): void
  registerMetric (name: string, opts?: MetricOptions): Metric
  registerMetric (name: string, opts: any = {}): any {
    if (name == null || name.trim() === '') {
      throw new Error('Metric name is required')
    }

    let metric = this.metrics.get(name)

    if (metric != null) {
      this.log('reuse existing metric', name)
      return metric
    }

    metric = new SimpleMetric(opts)
    this.metrics.set(name, metric)

    return metric
  }

  registerMetricGroup (name: string, opts: CalculatedMetricOptions<Record<string, number>>): void
  registerMetricGroup (name: string, opts?: MetricOptions): MetricGroup
  registerMetricGroup (name: string, opts: any = {}): any {
    if (name == null || name.trim() === '') {
      throw new Error('Metric name is required')
    }

    let metric = this.metrics.get(name)

    if (metric != null) {
      this.log('reuse existing metric', name)
      return metric
    }

    metric = new SimpleGroupMetric(opts)
    this.metrics.set(name, metric)

    return metric
  }

  registerCounter (name: string, opts: CalculatedMetricOptions): void
  registerCounter (name: string, opts?: MetricOptions): Counter
  registerCounter (name: string, opts: any = {}): any {
    if (name == null || name.trim() === '') {
      throw new Error('Metric name is required')
    }

    let metric = this.metrics.get(name)

    if (metric != null) {
      this.log('reuse existing metric', name)
      return metric
    }

    metric = new SimpleMetric(opts)
    this.metrics.set(name, metric)

    return metric
  }

  registerCounterGroup (name: string, opts: CalculatedMetricOptions<Record<string, number>>): void
  registerCounterGroup (name: string, opts?: MetricOptions): CounterGroup
  registerCounterGroup (name: string, opts: any = {}): any {
    if (name == null || name.trim() === '') {
      throw new Error('Metric name is required')
    }

    let metric = this.metrics.get(name)

    if (metric != null) {
      this.log('reuse existing metric', name)
      return metric
    }

    metric = new SimpleGroupMetric(opts)
    this.metrics.set(name, metric)

    return metric
  }

  registerHistogram (name: string, opts: CalculatedHistogramOptions): void
  registerHistogram (name: string, opts?: HistogramOptions): Histogram
  registerHistogram (name: string, opts: any = {}): any {
    if (name == null || name.trim() === '') {
      throw new Error('Metric name is required')
    }

    let metric = this.metrics.get(name)

    if (metric != null) {
      this.log('reuse existing metric', name)
      return metric
    }

    metric = new SimpleHistogram(opts)
    this.metrics.set(name, metric)

    return metric
  }

  registerHistogramGroup (name: string, opts: CalculatedHistogramOptions<Record<string, number>>): void
  registerHistogramGroup (name: string, opts?: HistogramOptions): HistogramGroup
  registerHistogramGroup (name: string, opts: any = {}): any {
    if (name == null || name.trim() === '') {
      throw new Error('Metric name is required')
    }

    let metric = this.metrics.get(name)

    if (metric != null) {
      this.log('reuse existing metric', name)
      return metric
    }

    metric = new SimpleHistogramGroup(opts)
    this.metrics.set(name, metric)

    return metric
  }

  registerSummary (name: string, opts: CalculatedSummaryOptions): void
  registerSummary (name: string, opts?: SummaryOptions): Summary
  registerSummary (name: string, opts: any = {}): any {
    if (name == null || name.trim() === '') {
      throw new Error('Metric name is required')
    }

    let metric = this.metrics.get(name)

    if (metric != null) {
      this.log('reuse existing metric', name)
      return metric
    }

    metric = new SimpleSummary(opts)
    this.metrics.set(name, metric)

    return metric
  }

  registerSummaryGroup (name: string, opts: CalculatedSummaryOptions<Record<string, number>>): void
  registerSummaryGroup (name: string, opts?: SummaryOptions): SummaryGroup
  registerSummaryGroup (name: string, opts: any = {}): any {
    if (name == null || name.trim() === '') {
      throw new Error('Metric name is required')
    }

    let metric = this.metrics.get(name)

    if (metric != null) {
      this.log('reuse existing metric', name)
      return metric
    }

    metric = new SimpleSummaryGroup(opts)
    this.metrics.set(name, metric)

    return metric
  }

  createTrace (): any {
    // no-op
  }

  traceFunction <T extends (...args: any[]) => any> (name: string, fn: T): T {
    // no-op
    return fn
  }
}

export function simpleMetrics (init: SimpleMetricsInit): (components: SimpleMetricsComponents) => Metrics {
  return (components) => new SimpleMetrics(components, init)
}
