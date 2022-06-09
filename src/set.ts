import type { PeerId } from '@libp2p/interfaces/peer-id'
import { peerIdFromString } from '@libp2p/peer-id'
import { mapIterable } from './util.js'

/**
 * We can't use PeerIds as set entries because set entries are
 * compared using same-value-zero equality, so this is just
 * a map that stringifies the PeerIds before storing them.
 *
 * PeerIds cache stringified versions of themselves so this
 * should be a cheap operation.
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

  get size () {
    return this.set.size
  }

  [Symbol.iterator] () {
    return this.values()
  }

  add (peer: PeerId) {
    this.set.add(peer.toString())
  }

  clear () {
    this.set.clear()
  }

  delete (peer: PeerId) {
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

  values () {
    return mapIterable<string, PeerId>(
      this.set.values(),
      (val) => {
        return peerIdFromString(val)
      }
    )
  }
}
