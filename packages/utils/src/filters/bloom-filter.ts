// ported from xxbloom - https://github.com/ceejbot/xxbloom/blob/master/LICENSE
import { randomBytes } from '@libp2p/crypto'
import { Uint8ArrayList } from 'uint8arraylist'
import { alloc } from 'uint8arrays/alloc'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { fnv1a } from './hashes.js'
import type { Filter } from './index.js'

const LN2_SQUARED = Math.LN2 * Math.LN2

export interface BloomFilterOptions {
  seeds?: number[]
  hashes?: number
  bits?: number
}

export class BloomFilter implements Filter {
  public readonly seeds: number[]
  public readonly bits: number
  public buffer: Uint8Array

  constructor (options: BloomFilterOptions = {}) {
    if (options.seeds != null) {
      this.seeds = options.seeds
    } else {
      this.seeds = generateSeeds(options.hashes ?? 8)
    }

    this.bits = options.bits ?? 1024
    this.buffer = alloc(Math.ceil(this.bits / 8))
  }

  /**
   * Add an item to the filter
   */
  add (item: Uint8Array | string): void {
    if (typeof item === 'string') {
      item = uint8ArrayFromString(item)
    }

    for (let i = 0; i < this.seeds.length; i++) {
      const hash = fnv1a.hash(item, this.seeds[i])
      const bit = hash % this.bits

      this.setbit(bit)
    }
  }

  /**
   * Test if the filter has an item. If it returns false it definitely does not
   * have the item. If it returns true, it probably has the item but there's
   * an `errorRate` chance it doesn't.
   */
  has (item: Uint8Array | string): boolean {
    if (typeof item === 'string') {
      item = uint8ArrayFromString(item)
    }

    for (let i = 0; i < this.seeds.length; i++) {
      const hash = fnv1a.hash(item, this.seeds[i])
      const bit = hash % this.bits

      const isSet = this.getbit(bit)

      if (!isSet) {
        return false
      }
    }

    return true
  }

  /**
   * Reset the filter
   */
  clear (): void {
    this.buffer.fill(0)
  }

  setbit (bit: number): void {
    const pos = Math.floor(bit / 8)
    const shift = bit % 8

    let bitField = this.buffer[pos]
    bitField |= (0x1 << shift)
    this.buffer[pos] = bitField
  }

  getbit (bit: number): boolean {
    const pos = Math.floor(bit / 8)
    const shift = bit % 8

    const bitField = this.buffer[pos]
    return (bitField & (0x1 << shift)) !== 0
  }
}

/**
 * Create a `BloomFilter` with the smallest `bits` and `hashes` value for the
 * specified item count and error rate.
 */
export function createBloomFilter (itemCount: number, errorRate: number = 0.005): Filter {
  const opts = optimize(itemCount, errorRate)
  return new BloomFilter(opts)
}

function optimize (itemCount: number, errorRate: number = 0.005): { bits: number, hashes: number } {
  const bits = Math.round(-1 * itemCount * Math.log(errorRate) / LN2_SQUARED)
  const hashes = Math.round((bits / itemCount) * Math.LN2)

  return { bits, hashes }
}

function generateSeeds (count: number): number[] {
  let buf: Uint8ArrayList
  let j: number
  const seeds = []

  for (let i = 0; i < count; i++) {
    buf = new Uint8ArrayList(randomBytes(4))
    seeds[i] = buf.getUint32(0, true)

    // Make sure we don't end up with two identical seeds,
    // which is unlikely but possible.
    for (j = 0; j < i; j++) {
      if (seeds[i] === seeds[j]) {
        i--
        break
      }
    }
  }

  return seeds
}
