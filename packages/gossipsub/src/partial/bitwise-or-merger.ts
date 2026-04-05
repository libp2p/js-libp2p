import type { PartsMetadataMerger } from '../types.js'

/**
 * Default PartsMetadataMerger that combines metadata using bitwise OR.
 * This is appropriate when parts metadata is a bitmask where each bit
 * represents whether a particular part is available.
 */
export class BitwiseOrMerger implements PartsMetadataMerger {
  /**
   * Merge two parts metadata bitmasks by applying bitwise OR byte-by-byte.
   * The result length is the max of the two inputs; missing bytes are treated as 0.
   */
  merge (a: Uint8Array, b: Uint8Array): Uint8Array {
    const len = Math.max(a.length, b.length)
    const result = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      result[i] = (a[i] ?? 0) | (b[i] ?? 0)
    }
    return result
  }
}
