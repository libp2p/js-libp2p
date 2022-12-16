import type { PeerId } from '@libp2p/interface-peer-id'
import { peerIdFromString } from '@libp2p/peer-id'
import { mapIterable } from './util.js'

/**
 * We can't use PeerIds as set entries because set entries are
 * compared using same-value-zero equality, so this is just
 * a map that stringifies the PeerIds before storing them.
 *
 * PeerIds cache stringified versions of themselves so this
 * should be a cheap operation.
 *
 * @example
 *
 * ```JavaScript
 * import { peerSet } from '@libp2p/peer-collections'
 *
 * const set = peerSet()
 * set.add(peerId)
 * ```
 */
export class PeerSet {
  private readonly set: Set<string>

  constructor (set?: PeerSet | Iterable<PeerId>) {
    this.set = new Set()

    if (set != null) {
      for (const key of set) {
        this.set.add(key.toString())
      }
    }
  }

  get size (): number {
    return this.set.size
  }

  [Symbol.iterator] (): IterableIterator<PeerId> {
    return this.values()
  }

  add (peer: PeerId): void {
    this.set.add(peer.toString())
  }

  clear (): void {
    this.set.clear()
  }

  delete (peer: PeerId): void {
    this.set.delete(peer.toString())
  }

  entries (): IterableIterator<[PeerId, PeerId]> {
    return mapIterable<[string, string], [PeerId, PeerId]>(
      this.set.entries(),
      (val) => {
        const peerId = peerIdFromString(val[0])

        return [peerId, peerId]
      }
    )
  }

  forEach (predicate: (peerId: PeerId, index: PeerId, set: PeerSet) => void): void {
    this.set.forEach((str) => {
      const id = peerIdFromString(str)

      predicate(id, id, this)
    })
  }

  has (peer: PeerId): boolean {
    return this.set.has(peer.toString())
  }

  values (): IterableIterator<PeerId> {
    return mapIterable<string, PeerId>(
      this.set.values(),
      (val) => {
        return peerIdFromString(val)
      }
    )
  }

  intersection (other: PeerSet): PeerSet {
    const output = new PeerSet()

    for (const peerId of other) {
      if (this.has(peerId)) {
        output.add(peerId)
      }
    }

    return output
  }

  difference (other: PeerSet): PeerSet {
    const output = new PeerSet()

    for (const peerId of this) {
      if (!other.has(peerId)) {
        output.add(peerId)
      }
    }

    return output
  }

  union (other: PeerSet): PeerSet {
    const output = new PeerSet()

    for (const peerId of other) {
      output.add(peerId)
    }

    for (const peerId of this) {
      output.add(peerId)
    }

    return output
  }
}
