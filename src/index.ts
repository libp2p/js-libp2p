import type { Metric, Metrics } from '@libp2p/interface-metrics'

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

  set (key: K, value: V) {
    super.set(key, value)
    this.updateComponentMetric()
    return this
  }

  delete (key: K) {
    const deleted = super.delete(key)
    this.updateComponentMetric()
    return deleted
  }

  clear () {
    super.clear()
    this.updateComponentMetric()
  }

  private updateComponentMetric () {
    this.metric.update(this.size)
  }
}

export interface CreateTrackedMapOptions {
  name: string
  metrics?: Metrics
}

export function trackedMap <K, V> (config: CreateTrackedMapOptions): Map<K, V> {
  const { name, metrics } = config
  let map: Map<K, V>

  if (metrics != null) {
    map = new TrackedMap<K, V>({ name, metrics })
  } else {
    map = new Map<K, V>()
  }

  return map
}
