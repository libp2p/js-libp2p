import type { Metrics } from '@libp2p/interface'

export interface CreateTrackedListInit {
  /**
   * The metric name to use
   */
  name: string

  /**
   * A metrics implementation
   */
  metrics?: Metrics
}

export function trackedList <V> (config: CreateTrackedListInit): V[] {
  const { name, metrics } = config
  const list: V[] = []

  metrics?.registerMetric(name, {
    calculate: () => {
      return list.length
    }
  })

  return list
}
