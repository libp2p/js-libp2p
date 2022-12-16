import type { PeerId } from '@libp2p/interface-peer-id'
import { peerIdFromString } from '@libp2p/peer-id'
import { mapIterable } from './util.js'

/**
 * We can't use PeerIds as map keys because map keys are
 * compared using same-value-zero equality, so this is just
 * a map that stringifies the PeerIds before storing them.
 *
 * PeerIds cache stringified versions of themselves so this
 * should be a cheap operation.
 *
 * @example
 *
 * ```JavaScript
 * import { peerMap } from '@libp2p/peer-collections'
 *
 * const map = peerMap<string>()
 * map.set(peerId, 'value')
 * ```
 */
export class PeerMap <T> {
  private readonly map: Map<string, T>

  constructor (map?: PeerMap<T>) {
    this.map = new Map()

    if (map != null) {
      for (const [key, value] of map.entries()) {
        this.map.set(key.toString(), value)
      }
    }
  }

  [Symbol.iterator] (): IterableIterator<[PeerId, T]> {
    return this.entries()
  }

  clear (): void {
    this.map.clear()
  }

  delete (peer: PeerId): void {
    this.map.delete(peer.toString())
  }

  entries (): IterableIterator<[PeerId, T]> {
    return mapIterable<[string, T], [PeerId, T]>(
      this.map.entries(),
      (val) => {
        return [peerIdFromString(val[0]), val[1]]
      }
    )
  }

  forEach (fn: (value: T, key: PeerId, map: PeerMap<T>) => void): void {
    this.map.forEach((value, key) => {
      fn(value, peerIdFromString(key), this)
    })
  }

  get (peer: PeerId): T | undefined {
    return this.map.get(peer.toString())
  }

  has (peer: PeerId): boolean {
    return this.map.has(peer.toString())
  }

  set (peer: PeerId, value: T): void {
    this.map.set(peer.toString(), value)
  }

  keys (): IterableIterator<PeerId> {
    return mapIterable<string, PeerId>(
      this.map.keys(),
      (val) => {
        return peerIdFromString(val)
      }
    )
  }

  values (): IterableIterator<T> {
    return this.map.values()
  }

  get size (): number {
    return this.map.size
  }
}
