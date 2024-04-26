import { BloomFilter } from '@libp2p/utils/bloom-filter'
import type { PeerId } from '@libp2p/interface'

/**
 * Uses a Bloom filter to implement a mechansim for deduplicating PeerIds in a
 * way that uses a fixed amount of memory.
 */
export class PeerFilter {
  private readonly filter: BloomFilter

  constructor (size: number, errorRate?: number) {
    this.filter = BloomFilter.create(size, errorRate)
  }

  has (peerId: PeerId): boolean {
    return this.filter.has(peerId.toBytes())
  }

  add (peerId: PeerId): void {
    this.filter.add(peerId.toBytes())
  }
}

export function peerFilter (size: number): PeerFilter {
  return new PeerFilter(size)
}
