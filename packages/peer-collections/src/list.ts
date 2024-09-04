import { mapIterable } from './util.js'
import type { PeerId } from '@libp2p/interface'

/**
 * We can't use PeerIds as list entries because list entries are
 * compared using same-value-zero equality, so this is just
 * a map that stringifies the PeerIds before storing them.
 *
 * PeerIds cache stringified versions of themselves so this
 * should be a cheap operation.
 *
 * @example
 *
 * ```TypeScript
 * import { peerList } from '@libp2p/peer-collections'
 *
 * const list = peerList()
 * list.push(peerId)
 * ```
 */
export class PeerList {
  private list: PeerId[]

  constructor (list?: PeerList | Iterable<PeerId>) {
    this.list = []

    if (list != null) {
      for (const value of list) {
        this.list.push(value)
      }
    }
  }

  [Symbol.iterator] (): IterableIterator<PeerId> {
    return mapIterable<[number, PeerId], PeerId>(
      this.list.entries(),
      (val) => {
        return val[1]
      }
    )
  }

  concat (list: PeerList): PeerList {
    const output = new PeerList(this)

    for (const value of list) {
      output.push(value)
    }

    return output
  }

  entries (): IterableIterator<[number, PeerId]> {
    return mapIterable<[number, PeerId], [number, PeerId]>(
      this.list.entries(),
      (val) => {
        return [val[0], val[1]]
      }
    )
  }

  every (predicate: (peerId: PeerId, index: number, arr: PeerList) => boolean): boolean {
    return this.list.every((peerId, index) => {
      return predicate(peerId, index, this)
    })
  }

  filter (predicate: (peerId: PeerId, index: number, arr: PeerList) => boolean): PeerList {
    const output = new PeerList()

    this.list.forEach((peerId, index) => {
      if (predicate(peerId, index, this)) {
        output.push(peerId)
      }
    })

    return output
  }

  find (predicate: (peerId: PeerId, index: number, arr: PeerList) => boolean): PeerId | undefined {
    const peerId = this.list.find((peerId, index) => {
      return predicate(peerId, index, this)
    })

    if (peerId == null) {
      return undefined
    }

    return peerId
  }

  findIndex (predicate: (peerId: PeerId, index: number, arr: PeerList) => boolean): number {
    return this.list.findIndex((peerId, index) => {
      return predicate(peerId, index, this)
    })
  }

  forEach (predicate: (peerId: PeerId, index: number, arr: PeerList) => void): void {
    this.list.forEach((peerId, index) => {
      predicate(peerId, index, this)
    })
  }

  includes (peerId: PeerId): boolean {
    return this.includes(peerId)
  }

  indexOf (peerId: PeerId): number {
    return this.list.findIndex(id => id.equals(peerId))
  }

  pop (): PeerId | undefined {
    const peerId = this.list.pop()

    if (peerId == null) {
      return undefined
    }

    return peerId
  }

  push (...peerIds: PeerId[]): void {
    for (const peerId of peerIds) {
      this.list.push(peerId)
    }
  }

  shift (): PeerId | undefined {
    const peerId = this.list.shift()

    if (peerId == null) {
      return undefined
    }

    return peerId
  }

  unshift (...peerIds: PeerId[]): number {
    let len = this.list.length

    for (let i = peerIds.length - 1; i > -1; i--) {
      len = this.list.unshift(peerIds[i])
    }

    return len
  }

  clear (): void {
    this.list = []
  }

  get length (): number {
    return this.list.length
  }
}

export function peerList (): PeerList {
  return new PeerList()
}
