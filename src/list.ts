import type { PeerId } from '@libp2p/interface-peer-id'
import { peerIdFromString } from '@libp2p/peer-id'
import { mapIterable } from './util.js'

/**
 * We can't use PeerIds as list entries because list entries are
 * compared using same-value-zero equality, so this is just
 * a map that stringifies the PeerIds before storing them.
 *
 * PeerIds cache stringified versions of themselves so this
 * should be a cheap operation.
 */
export class PeerList {
  private readonly list: string[]

  constructor (list?: PeerList | Iterable<PeerId>) {
    this.list = []

    if (list != null) {
      for (const value of list) {
        this.list.push(value.toString())
      }
    }
  }

  [Symbol.iterator] (): IterableIterator<PeerId> {
    return mapIterable<[number, string], PeerId>(
      this.list.entries(),
      (val) => {
        return peerIdFromString(val[1])
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
    return mapIterable<[number, string], [number, PeerId]>(
      this.list.entries(),
      (val) => {
        return [val[0], peerIdFromString(val[1])]
      }
    )
  }

  every (predicate: (peerId: PeerId, index: number, arr: PeerList) => boolean): boolean {
    return this.list.every((str, index) => {
      return predicate(peerIdFromString(str), index, this)
    })
  }

  filter (predicate: (peerId: PeerId, index: number, arr: PeerList) => boolean): PeerList {
    const output = new PeerList()

    this.list.forEach((str, index) => {
      const peerId = peerIdFromString(str)

      if (predicate(peerId, index, this)) {
        output.push(peerId)
      }
    })

    return output
  }

  find (predicate: (peerId: PeerId, index: number, arr: PeerList) => boolean): PeerId | undefined {
    const str = this.list.find((str, index) => {
      return predicate(peerIdFromString(str), index, this)
    })

    if (str == null) {
      return undefined
    }

    return peerIdFromString(str)
  }

  findIndex (predicate: (peerId: PeerId, index: number, arr: PeerList) => boolean): number {
    return this.list.findIndex((str, index) => {
      return predicate(peerIdFromString(str), index, this)
    })
  }

  forEach (predicate: (peerId: PeerId, index: number, arr: PeerList) => void): void {
    this.list.forEach((str, index) => {
      predicate(peerIdFromString(str), index, this)
    })
  }

  includes (peerId: PeerId): boolean {
    return this.list.includes(peerId.toString())
  }

  indexOf (peerId: PeerId): number {
    return this.list.indexOf(peerId.toString())
  }

  pop (): PeerId | undefined {
    const str = this.list.pop()

    if (str == null) {
      return undefined
    }

    return peerIdFromString(str)
  }

  push (...peerIds: PeerId[]): void {
    for (const peerId of peerIds) {
      this.list.push(peerId.toString())
    }
  }

  shift (): PeerId | undefined {
    const str = this.list.shift()

    if (str == null) {
      return undefined
    }

    return peerIdFromString(str)
  }

  unshift (...peerIds: PeerId[]): number {
    let len = this.list.length

    for (let i = peerIds.length - 1; i > -1; i--) {
      len = this.list.unshift(peerIds[i].toString())
    }

    return len
  }

  get length (): number {
    return this.list.length
  }
}
