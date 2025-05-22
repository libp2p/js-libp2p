import { alloc as uint8ArrayAlloc } from 'uint8arrays/alloc'
import { equals as uint8ArrayEquals } from 'uint8arrays/equals'
import type { Hash } from './hashes.js'

export const MAX_FINGERPRINT_SIZE = 64

export class Fingerprint {
  private readonly fp: Uint8Array
  private readonly h: Hash
  private readonly seed: number

  constructor (buf: Uint8Array, hash: Hash, seed: number, fingerprintSize: number = 2) {
    if (fingerprintSize > MAX_FINGERPRINT_SIZE) {
      throw new TypeError('Invalid Fingerprint Size')
    }

    const fnv = hash.hashV(buf, seed)
    const fp = uint8ArrayAlloc(fingerprintSize)

    for (let i = 0; i < fp.length; i++) {
      fp[i] = fnv[i]
    }

    if (fp.length === 0) {
      fp[0] = 7
    }

    this.fp = fp
    this.h = hash
    this.seed = seed
  }

  hash (): number {
    return this.h.hash(this.fp, this.seed)
  }

  equals (other?: any): boolean {
    if (!(other?.fp instanceof Uint8Array)) {
      return false
    }

    return uint8ArrayEquals(this.fp, other.fp)
  }
}
