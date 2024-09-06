import { peerIdFromMultihash } from '@libp2p/peer-id'
import { base58btc } from 'multiformats/bases/base58'
import * as Digest from 'multiformats/hashes/digest'
import type { PeerId } from '@libp2p/interface'

/**
 * Calls the passed map function on every entry of the passed iterable iterator
 */
export function mapIterable <T, R> (iter: IterableIterator<T>, map: (val: T) => R): IterableIterator<R> {
  const iterator: IterableIterator<R> = {
    [Symbol.iterator]: () => {
      return iterator
    },
    next: () => {
      const next = iter.next()
      const val = next.value

      if (next.done === true || val == null) {
        const result: IteratorReturnResult<any> = {
          done: true,
          value: undefined
        }

        return result
      }

      return {
        done: false,
        value: map(val)
      }
    }
  }

  return iterator
}

export function peerIdFromString (str: string): PeerId {
  const multihash = Digest.decode(base58btc.decode(`z${str}`))
  return peerIdFromMultihash(multihash)
}
