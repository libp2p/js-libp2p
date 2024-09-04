import { createScalableCuckooFilter } from '@libp2p/utils/filters'
import type { PeerId } from '@libp2p/interface'
import type { Filter } from '@libp2p/utils/filters'

/**
 * Uses a Cuckoo filter to implement a mechanism for deduplicating PeerIds in a
 * way that uses a smaller amount of memory than a PeerSet.
 */
export class PeerFilter {
  private readonly filter: Filter

  constructor (size: number, errorRate?: number) {
    this.filter = createScalableCuckooFilter(size, errorRate)
  }

  has (peerId: PeerId): boolean {
    return this.filter.has(peerId.toMultihash().bytes)
  }

  add (peerId: PeerId): void {
    this.filter.add(peerId.toMultihash().bytes)
  }

  remove (peerId: PeerId): void {
    this.filter.remove?.(peerId.toMultihash().bytes)
  }
}

/**
 * Create and return a PeerFilter
 *
 * @param size - The maximum number of peers expected to be added to the filter
 * @param errorRate - The acceptable error rate
 */
export function peerFilter (size: number, errorRate: number = 0.001): PeerFilter {
  return new PeerFilter(size, errorRate)
}
