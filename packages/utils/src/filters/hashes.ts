import fnv1aHash from '@sindresorhus/fnv1a'
import mur from 'murmurhash3js-revisited'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'

export interface Hash {
  hash(input: Uint8Array, seed: number): number
  hashV(input: Uint8Array, seed: number): Uint8Array
}

export const murmur3: Hash = {
  hash: (input, seed) => {
    return mur.x86.hash32(input, seed)
  },
  hashV: (input, seed) => {
    return numberToBuffer(murmur3.hash(input, seed))
  }
}

export const fnv1a: Hash = {
  hash: (input) => {
    return Number(fnv1aHash(input, {
      size: 32
    }))
  },
  hashV: (input, seed) => {
    return numberToBuffer(fnv1a.hash(input, seed))
  }
}

export function numberToBuffer (num: bigint | number): Uint8Array {
  let hex = num.toString(16)

  if (hex.length % 2 === 1) {
    hex = `0${hex}`
  }

  return uint8ArrayFromString(hex, 'base16')
}
