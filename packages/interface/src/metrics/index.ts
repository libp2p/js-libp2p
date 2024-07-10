import type { MultiaddrConnection, Stream, Connection } from '../connection/index.js'

/**
 * Create tracked metrics with these options. Loosely based on the
 * interfaces exposed by the prom-client module
 */
export interface MetricOptions {
  /**
   * Optional label for the metric
   */
  label?: string

  /**
   * Optional help for the metric
   */
  help?: string
}

/**
 * A function that returns a tracked metric which may be expensive
 * to calculate so it is only invoked when metrics are being scraped
 */
export type CalculateMetric<T = number> = (() => T) | (() => Promise<T>)

/**
 * Create tracked metrics that are expensive to calculate by passing
 * a function that is only invoked when metrics are being scraped
 */
export interface CalculatedMetricOptions<T = number> extends MetricOptions {
  /**
   * An optional function invoked to calculate the component metric instead of
   * using `.update`, `.increment`, and `.decrement`
   */
  calculate: CalculateMetric<T>
}

/**
 * Call this function to stop the timer returned from the `.timer` method
 * on the metric
 */
export interface StopTimer { (): void }

/**
 * A tracked metric loosely based on the interfaces exposed by the
 * prom-client module
 */
export interface Metric {
  /**
   * Update the stored metric to the passed value
   */
  update(value: number): void

  /**
   * Increment the metric by the passed value or 1
   */
  increment(value?: number): void

  /**
   * Decrement the metric by the passed value or 1
   */
  decrement(value?: number): void

  /**
   * Reset this metric to its default value
   */
  reset(): void

  /**
   * Start a timed metric, call the returned function to
   * stop the timer
   */
  timer(): StopTimer
}

/**
 * A group of related metrics loosely based on the interfaces exposed by the
 * prom-client module
 */
export interface MetricGroup {
  /**
   * Update the stored metric group to the passed value
   */
  update(values: Record<string, number>): void

  /**
   * Increment the metric group keys by the passed number or
   * any non-numeric value to increment by 1
   */
  increment(values: Record<string, number | unknown>): void

  /**
   * Decrement the metric group keys by the passed number or
   * any non-numeric value to decrement by 1
   */
  decrement(values: Record<string, number | unknown>): void

  /**
   * Reset the passed key in this metric group to its default value
   * or all keys if no key is passed
   */
  reset(): void

  /**
   * Start a timed metric for the named key in the group, call
   * the returned function to stop the timer
   */
  timer(key: string): StopTimer
}

/**
 * A tracked counter loosely based on the Counter interface exposed
 * by the prom-client module - counters are metrics that only go up
 */
export interface Counter {
  /**
   * Increment the metric by the passed value or 1
   */
  increment(value?: number): void

  /**
   * Reset this metric to its default value
   */
  reset(): void
}

/**
 * A group of tracked counters loosely based on the Counter interface
 * exposed by the prom-client module - counters are metrics that only
 * go up
 */
export interface CounterGroup {
  /**
   * Increment the metric group keys by the passed number or
   * any non-numeric value to increment by 1
   */
  increment(values: Record<string, number | unknown>): void

  /**
   * Reset the passed key in this metric group to its default value
   * or all keys if no key is passed
   */
  reset(): void
}

/**
 * The libp2p metrics tracking object. This interface is only concerned
 * with the collection of metrics, please see the individual implementations
 * for how to extract metrics for viewing.
 *
 * @example How to register a simple metric
 *
 * ```typescript
 * import { Metrics, Metric } from '@libp2p/interface/metrics'
 *
 * interface MyServiceComponents {
 *   metrics: Metrics
 * }
 *
 * class MyService {
 *   private readonly myMetric: Metric
 *
 *   constructor (components: MyServiceComponents) {
 *     this.myMetric = components.metrics.registerMetric({
 *       name: 'my_metric',
 *       label: 'my_label',
 *       help: 'my help text'
 *     })
 *   }
 *
 *   // later
 *   doSomething () {
 *     this.myMetric.update(1)
 *   }
 * }
 * ```
 *
 * @example How to register a dynamically calculated metric
 *
 * A metric that is expensive to calculate can be created by passing a `calculate` function that will only be invoked when metrics are being scraped:
 *
 * ```typescript
 * import { Metrics, Metric } from '@libp2p/interface/metrics'
 *
 * interface MyServiceComponents {
 *   metrics: Metrics
 * }
 *
 * class MyService {
 *   private readonly myMetric: Metric
 *
 *   constructor (components: MyServiceComponents) {
 *     this.myMetric = components.metrics.registerMetric({
 *       name: 'my_metric',
 *       label: 'my_label',
 *       help: 'my help text',
 *       calculate: async () => {
 *         // do something expensive
 *         return 1
 *       }
 *     })
 *   }
 * }
 * ```
 *
 * @example How to register a group of metrics
 *
 * If several metrics should be grouped together (e.g. for graphing purposes) `registerMetricGroup` can be used instead:
 *
 * ```typescript
 * import { Metrics, MetricGroup } from '@libp2p/interface/metrics'
 *
 * interface MyServiceComponents {
 *   metrics: Metrics
 * }
 *
 * class MyService {
 *   private readonly myMetricGroup: MetricGroup
 *
 *   constructor (components: MyServiceComponents) {
 *     this.myMetricGroup = components.metrics.registerMetricGroup({
 *       name: 'my_metric_group',
 *       label: 'my_label',
 *       help: 'my help text'
 *     })
 *   }
 *
 *   // later
 *   doSomething () {
 *     this.myMetricGroup.increment({ my_label: 'my_value' })
 *   }
 * }
 * ```
 *
 * There are specific metric groups for tracking libp2p connections and streams:
 *
 * @example How to track multiaddr connections
 *
 * This is something only libp2p transports need to do.
 *
 * ```typescript
 * import { Metrics } from '@libp2p/interface/metrics'
 *
 * interface MyServiceComponents {
 *   metrics: Metrics
 * }
 *
 * class MyService {
 *   private readonly metrics: Metrics
 *
 *   constructor (components: MyServiceComponents) {
 *     this.metrics = components.metrics
 *   }
 *
 *   // later
 *   doSomething () {
 *     const connection = {} // create a connection
 *     this.metrics.trackMultiaddrConnection(connection)
 *   }
 * }
 * ```
 *
 * @example How to track protocol streams
 *
 * This is something only libp2p connections need to do.
 *
 * ```typescript
 * import { Metrics } from '@libp2p/interface/metrics'
 *
 * interface MyServiceComponents {
 *   metrics: Metrics
 * }
 *
 * class MyService {
 *   private readonly metrics: Metrics
 *
 *   constructor (components: MyServiceComponents) {
 *     this.metrics = components.metrics
 *   }
 *
 *   // later
 *   doSomething () {
 *     const stream = {} // create a stream
 *     this.metrics.trackProtocolStream(stream)
 *   }
 * }
 * ```
 */
export interface Metrics {
  /**
   * Track a newly opened multiaddr connection
   */
  trackMultiaddrConnection(maConn: MultiaddrConnection): void

  /**
   * Track a newly opened protocol stream
   */
  trackProtocolStream(stream: Stream, connection: Connection): void

  /**
   * Register an arbitrary metric. Call this to set help/labels for metrics
   * and update/increment/decrement/etc them by calling methods on the returned
   * metric object
   */
  registerMetric: ((name: string, options?: MetricOptions) => Metric) & ((name: string, options: CalculatedMetricOptions) => void)

  /**
   * Register a a group of related metrics. Call this to set help/labels for
   * groups of related metrics that will be updated with by calling `.update`,
   * `.increment` and/or `.decrement` methods on the returned metric group object
   */
  registerMetricGroup: ((name: string, options?: MetricOptions) => MetricGroup) & ((name: string, options: CalculatedMetricOptions<Record<string, number>>) => void)

  /**
   * Register an arbitrary counter. Call this to set help/labels for counters
   * and increment them by calling methods on the returned counter object
   */
  registerCounter: ((name: string, options?: MetricOptions) => Counter) & ((name: string, options: CalculatedMetricOptions) => void)

  /**
   * Register a a group of related counters. Call this to set help/labels for
   * groups of related counters that will be updated with by calling the `.increment`
   * method on the returned counter group object
   */
  registerCounterGroup: ((name: string, options?: MetricOptions) => CounterGroup) & ((name: string, options: CalculatedMetricOptions<Record<string, number>>) => void)
}
