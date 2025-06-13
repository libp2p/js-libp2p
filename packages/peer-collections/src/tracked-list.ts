import { PeerList } from './list.js'
import type { Metric, Metrics, PeerId } from '@libp2p/interface'

export interface TrackedPeerListInit {
  name: string
  metrics?: Metrics
}

class TrackedPeerList extends PeerList {
  private readonly metric: Metric

  constructor (init: Required<TrackedPeerListInit>) {
    super()

    const { name, metrics } = init

    this.metric = metrics.registerMetric(name)
    this.updateComponentMetric()
  }

  pop (): PeerId | undefined {
    const peerId = super.pop()
    this.updateComponentMetric()
    return peerId
  }

  push (...peerIds: PeerId[]): void {
    super.push(...peerIds)
    this.updateComponentMetric()
  }

  shift (): PeerId | undefined {
    const peerId = super.shift()
    this.updateComponentMetric()
    return peerId
  }

  unshift (...peerIds: PeerId[]): number {
    const result = super.unshift(...peerIds)
    this.updateComponentMetric()
    return result
  }

  clear (): void {
    super.clear()
    this.updateComponentMetric()
  }

  private updateComponentMetric (): void {
    this.metric.update(this.length)
  }
}

/**
 * Creates a PeerList that reports it's size to the libp2p Metrics service
 *
 * @example
 *
 * ```Typescript
 * import { trackedPeerList } from '@libp2p/peer-collections'
 * import { createLibp2p } from 'libp2p'
 *
 * const libp2p = await createLibp2p()
 *
 * const list = trackedPeerList({ name: 'my_metric_name', metrics: libp2p.metrics })
 * list.push(peerId)
 * ```
 */
export function trackedPeerList (config: TrackedPeerListInit): PeerList {
  const { name, metrics } = config
  let map: PeerList

  if (metrics != null) {
    map = new TrackedPeerList({ name, metrics })
  } else {
    map = new PeerList()
  }

  return map
}
