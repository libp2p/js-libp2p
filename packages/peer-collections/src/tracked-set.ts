import { PeerSet } from './set.js'
import type { Metric, Metrics, PeerId } from '@libp2p/interface'

export interface TrackedPeerSetInit {
  name: string
  metrics?: Metrics
}

class TrackedPeerSet extends PeerSet {
  private readonly metric: Metric

  constructor (init: Required<TrackedPeerSetInit>) {
    super()

    const { name, metrics } = init

    this.metric = metrics.registerMetric(name)
    this.updateComponentMetric()
  }

  add (peer: PeerId): void {
    super.add(peer)
    this.updateComponentMetric()
  }

  delete (peer: PeerId): void {
    super.delete(peer)
    this.updateComponentMetric()
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
 * Creates a PeerSet that reports it's size to the libp2p Metrics service
 *
 * @example Tracked peer sets
 *
 * ```Typescript
 * import { trackedPeerSet } from '@libp2p/peer-collections'
 * import { createLibp2p } from 'libp2p'
 *
 * const libp2p = await createLibp2p()
 *
 * const list = trackedPeerSet({ name: 'my_metric_name', metrics: libp2p.metrics })
 * map.add(peerId)
 * ```
 */
export function trackedPeerSet (config: TrackedPeerSetInit): PeerSet {
  const { name, metrics } = config
  let map: PeerSet

  if (metrics != null) {
    map = new TrackedPeerSet({ name, metrics })
  } else {
    map = new PeerSet()
  }

  return map
}
