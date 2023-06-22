import type { Metric, Metrics } from './index.js'

export interface TrackedMapInit {
  name: string
  metrics: Metrics
}

class TrackedMap<K, V> extends Map<K, V> {
  private readonly metric: Metric

  constructor (init: TrackedMapInit) {
    super()

    const { name, metrics } = init

    this.metric = metrics.registerMetric(name)
    this.updateComponentMetric()
  }

  set (key: K, value: V): this {
    super.set(key, value)
    this.updateComponentMetric()
    return this
  }

  delete (key: K): boolean {
    const deleted = super.delete(key)
    this.updateComponentMetric()
    return deleted
  }

  clear (): void {
    super.clear()
    this.updateComponentMetric()
  }

  private updateComponentMetric (): void {
    this.metric.update(this.size)
  }
}

export interface CreateTrackedMapInit {
  /**
   * The metric name to use
   */
  name: string

  /**
   * A metrics implementation
   */
  metrics?: Metrics
}

export function trackedMap <K, V> (config: CreateTrackedMapInit): Map<K, V> {
  const { name, metrics } = config
  let map: Map<K, V>

  if (metrics != null) {
    map = new TrackedMap<K, V>({ name, metrics })
  } else {
    map = new Map<K, V>()
  }

  return map
}
