import type { PartsMetadataMerger } from '../types.js'

/**
 * Default PartsMetadataMerger that combines metadata using bitwise OR.
 * This is appropriate when parts metadata is a bitmask where each bit
 * represents whether a particular part is available.
 */
export class BitwiseOrMerger implements PartsMetadataMerger {
  merge (a: Uint8Array, b: Uint8Array): Uint8Array {
    const len = Math.max(a.length, b.length)
    const result = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      result[i] = (a[i] ?? 0) | (b[i] ?? 0)
    }
    return result
  }
}
