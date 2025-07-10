import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { CuckooFilter, optimize } from './cuckoo-filter.js'
import { fnv1a } from './hashes.js'
import { getRandomInt } from './utils.js'
import type { CuckooFilterInit } from './cuckoo-filter.js'
import type { Hash } from './hashes.js'
import type { Filter } from './index.js'

export interface ScalableCuckooFilterInit extends CuckooFilterInit {
  /**
   * A number to multiply maxItems by when adding new sub-filters
   */
  scale?: number
}

export class ScalableCuckooFilter implements Filter {
  private readonly filterSize: number
  private readonly bucketSize: number
  private readonly fingerprintSize: number
  private readonly scale: number
  private readonly filterSeries: CuckooFilter[]
  private readonly hash: Hash
  private readonly seed: number

  constructor (init: ScalableCuckooFilterInit) {
    this.bucketSize = init.bucketSize ?? 4
    this.filterSize = init.filterSize ?? (1 << 18) / this.bucketSize
    this.fingerprintSize = init.fingerprintSize ?? 2
    this.scale = init.scale ?? 2
    this.hash = init.hash ?? fnv1a
    this.seed = init.seed ?? getRandomInt(0, Math.pow(2, 10))
    this.filterSeries = [
      new CuckooFilter({
        filterSize: this.filterSize,
        bucketSize: this.bucketSize,
        fingerprintSize: this.fingerprintSize,
        hash: this.hash,
        seed: this.seed
      })
    ]
  }

  add (item: Uint8Array | string): boolean {
    if (typeof item === 'string') {
      item = uint8ArrayFromString(item)
    }

    if (this.has(item)) {
      return true
    }

    let current = this.filterSeries.find((cuckoo) => {
      return cuckoo.reliable
    })

    if (current == null) {
      const curSize = this.filterSize * Math.pow(this.scale, this.filterSeries.length)

      current = new CuckooFilter({
        filterSize: curSize,
        bucketSize: this.bucketSize,
        fingerprintSize: this.fingerprintSize,
        hash: this.hash,
        seed: this.seed
      })

      this.filterSeries.push(current)
    }

    return current.add(item)
  }

  has (item: Uint8Array | string): boolean {
    if (typeof item === 'string') {
      item = uint8ArrayFromString(item)
    }

    for (let i = 0; i < this.filterSeries.length; i++) {
      if (this.filterSeries[i].has(item)) {
        return true
      }
    }

    return false
  }

  remove (item: Uint8Array | string): boolean {
    if (typeof item === 'string') {
      item = uint8ArrayFromString(item)
    }

    for (let i = 0; i < this.filterSeries.length; i++) {
      if (this.filterSeries[i].remove(item)) {
        return true
      }
    }

    return false
  }

  get count (): number {
    return this.filterSeries.reduce((acc, curr) => {
      return acc + curr.count
    }, 0)
  }
}

export function createScalableCuckooFilter (maxItems: number, errorRate: number = 0.001, options?: Pick<ScalableCuckooFilterInit, 'hash' | 'seed' | 'scale'>): Filter {
  return new ScalableCuckooFilter({
    ...optimize(maxItems, errorRate),
    ...(options ?? {})
  })
}
