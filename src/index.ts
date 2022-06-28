import type { ComponentMetricsTracker } from '@libp2p/interface-metrics'

export interface TrackedMapInit {
  metrics: ComponentMetricsTracker
  system?: string
  component: string
  metric: string
}

class TrackedMap<K, V> extends Map<K, V> {
  private readonly system: string
  private readonly component: string
  private readonly metric: string
  private readonly metrics: ComponentMetricsTracker

  constructor (init: TrackedMapInit) {
    super()

    const { system, component, metric, metrics } = init
    this.system = system ?? 'libp2p'
    this.component = component
    this.metric = metric
    this.metrics = metrics

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
    this.metrics.updateComponentMetric({
      system: this.system,
      component: this.component,
      metric: this.metric,
      value: this.size
    })
  }
}

export interface CreateTrackedMapOptions {
  metrics?: ComponentMetricsTracker
  system?: string
  component: string
  metric: string
}

export function trackedMap <K, V> (config: CreateTrackedMapOptions): Map<K, V> {
  const { system, component, metric, metrics } = config
  let map: Map<K, V>

  if (metrics != null) {
    map = new TrackedMap<K, V>({ system, component, metric, metrics })
  } else {
    map = new Map<K, V>()
  }

  return map
}
