import { PeerMap } from './map.js'
import type { Metric, Metrics, PeerId } from '@libp2p/interface'

export interface TrackedPeerMapInit {
  name: string
  metrics?: Metrics
}

class TrackedPeerMap<V> extends PeerMap<V> {
  private readonly metric: Metric

  constructor (init: Required<TrackedPeerMapInit>) {
    super()

    const { name, metrics } = init

    this.metric = metrics.registerMetric(name)
    this.updateComponentMetric()
  }

  set (key: PeerId, value: V): this {
    super.set(key, value)
    this.updateComponentMetric()
    return this
  }

  delete (key: PeerId): boolean {
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

/**
 * Creates a PeerMap that reports it's size to the libp2p Metrics service
 *
 * @example
 *
 * ```Typescript
 * import { trackedPeerMap } from '@libp2p/peer-collections'
 * import { createLibp2p } from 'libp2p'
 *
 * const libp2p = await createLibp2p()
 *
 * const list = trackedPeerMap({ name: 'my_metric_name', metrics: libp2p.metrics })
 * map.set(peerId, 'value')
 * ```
 */
export function trackedPeerMap <V> (config: TrackedPeerMapInit): PeerMap<V> {
  const { name, metrics } = config
  let map: PeerMap<V>

  if (metrics != null) {
    map = new TrackedPeerMap<V>({ name, metrics })
  } else {
    map = new PeerMap<V>()
  }

  return map
}
