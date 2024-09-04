import { mapIterable } from './util.js'
import type { PeerId } from '@libp2p/interface'

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
 * ```TypeScript
 * import { peerMap } from '@libp2p/peer-collections'
 *
 * const map = peerMap<string>()
 * map.set(peerId, 'value')
 * ```
 */
export class PeerMap <T> {
  private readonly map: Map<string, { key: PeerId, value: T }>

  constructor (map?: PeerMap<T>) {
    this.map = new Map()

    if (map != null) {
      for (const [key, value] of map.entries()) {
        this.map.set(key.toString(), { key, value })
      }
    }
  }

  [Symbol.iterator] (): IterableIterator<[PeerId, T]> {
    return this.entries()
  }

  clear (): void {
    this.map.clear()
  }

  delete (peer: PeerId): boolean {
    return this.map.delete(peer.toString())
  }

  entries (): IterableIterator<[PeerId, T]> {
    return mapIterable<[string, { key: PeerId, value: T }], [PeerId, T]>(
      this.map.entries(),
      (val) => {
        return [val[1].key, val[1].value]
      }
    )
  }

  forEach (fn: (value: T, key: PeerId, map: PeerMap<T>) => void): void {
    this.map.forEach((value, key) => {
      fn(value.value, value.key, this)
    })
  }

  get (peer: PeerId): T | undefined {
    return this.map.get(peer.toString())?.value
  }

  has (peer: PeerId): boolean {
    return this.map.has(peer.toString())
  }

  set (peer: PeerId, value: T): void {
    this.map.set(peer.toString(), { key: peer, value })
  }

  keys (): IterableIterator<PeerId> {
    return mapIterable<{ key: PeerId, value: T }, PeerId>(
      this.map.values(),
      (val) => {
        return val.key
      }
    )
  }

  values (): IterableIterator<T> {
    return mapIterable(this.map.values(), (val) => val.value)
  }

  get size (): number {
    return this.map.size
  }
}

export function peerMap <T> (): PeerMap<T> {
  return new PeerMap<T>()
}
