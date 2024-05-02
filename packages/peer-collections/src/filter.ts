import { createScalableCuckooFilter } from '@libp2p/utils/filters'
import type { PeerId } from '@libp2p/interface'
import type { Filter } from '@libp2p/utils/filters'

/**
 * Uses a Bloom filter to implement a mechansim for deduplicating PeerIds in a
 * way that uses a fixed amount of memory.
 */
export class PeerFilter {
  private readonly filter: Filter

  constructor (size: number, errorRate?: number) {
    this.filter = createScalableCuckooFilter(size, errorRate)
  }

  has (peerId: PeerId): boolean {
    return this.filter.has(peerId.toBytes())
  }

  add (peerId: PeerId): void {
    this.filter.add(peerId.toBytes())
  }

  remove (peerId: PeerId): void {
    this.filter.remove?.(peerId.toBytes())
  }
}

export function peerFilter (size: number): PeerFilter {
  return new PeerFilter(size)
}
