import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { Bucket } from './bucket.js'
import { Fingerprint, MAX_FINGERPRINT_SIZE } from './fingerprint.js'
import { fnv1a } from './hashes.js'
import { getRandomInt } from './utils.js'
import type { Hash } from './hashes.js'
import type { Filter } from './index.js'

const maxCuckooCount = 500

export interface CuckooFilterInit {
  /**
   * How many items the filter is expected to contain
   */
  filterSize: number

  /**
   * How many items to put in each bucket
   */
  bucketSize?: number

  /**
   * How many bytes the fingerprint is expected to be
   */
  fingerprintSize?: number

  /**
   * A non-cryptographic hash implementation
   */
  hash?: Hash

  /**
   * A number used to seed the hash
   */
  seed?: number
}

export class CuckooFilter implements Filter {
  private readonly bucketSize: number
  private readonly filterSize: number
  private readonly fingerprintSize: number
  private readonly buckets: Bucket[]
  public count: number
  private readonly hash: Hash
  private readonly seed: number

  constructor (init: CuckooFilterInit) {
    this.filterSize = init.filterSize
    this.bucketSize = init.bucketSize ?? 4
    this.fingerprintSize = init.fingerprintSize ?? 2
    this.count = 0
    this.buckets = []
    this.hash = init.hash ?? fnv1a
    this.seed = init.seed ?? getRandomInt(0, Math.pow(2, 10))
  }

  add (item: Uint8Array | string): boolean {
    if (typeof item === 'string') {
      item = uint8ArrayFromString(item)
    }

    const fingerprint = new Fingerprint(item, this.hash, this.seed, this.fingerprintSize)
    const j = this.hash.hash(item, this.seed) % this.filterSize
    const k = (j ^ fingerprint.hash()) % this.filterSize

    if (this.buckets[j] == null) {
      this.buckets[j] = new Bucket(this.bucketSize)
    }

    if (this.buckets[k] == null) {
      this.buckets[k] = new Bucket(this.bucketSize)
    }

    if (this.buckets[j].add(fingerprint) || this.buckets[k].add(fingerprint)) {
      this.count++
      return true
    }

    const rand = [j, k]
    let i = rand[getRandomInt(0, rand.length - 1)]

    if (this.buckets[i] == null) {
      this.buckets[i] = new Bucket(this.bucketSize)
    }

    for (let n = 0; n < maxCuckooCount; n++) {
      const swapped = this.buckets[i].swap(fingerprint)

      if (swapped == null) {
        continue
      }

      i = (i ^ swapped.hash()) % this.filterSize

      if (this.buckets[i] == null) {
        this.buckets[i] = new Bucket(this.bucketSize)
      }

      if (this.buckets[i].add(swapped)) {
        this.count++

        return true
      } else {
        continue
      }
    }

    return false
  }

  has (item: Uint8Array | string): boolean {
    if (typeof item === 'string') {
      item = uint8ArrayFromString(item)
    }

    const fingerprint = new Fingerprint(item, this.hash, this.seed, this.fingerprintSize)
    const j = this.hash.hash(item, this.seed) % this.filterSize
    const inJ = this.buckets[j]?.has(fingerprint) ?? false

    if (inJ) {
      return inJ
    }

    const k = (j ^ fingerprint.hash()) % this.filterSize

    return this.buckets[k]?.has(fingerprint) ?? false
  }

  remove (item: Uint8Array | string): boolean {
    if (typeof item === 'string') {
      item = uint8ArrayFromString(item)
    }

    const fingerprint = new Fingerprint(item, this.hash, this.seed, this.fingerprintSize)
    const j = this.hash.hash(item, this.seed) % this.filterSize
    const inJ = this.buckets[j]?.remove(fingerprint) ?? false

    if (inJ) {
      this.count--
      return inJ
    }

    const k = (j ^ fingerprint.hash()) % this.filterSize
    const inK = this.buckets[k]?.remove(fingerprint) ?? false

    if (inK) {
      this.count--
    }

    return inK
  }

  get reliable (): boolean {
    return Math.floor(100 * (this.count / this.filterSize)) <= 90
  }
}

// max load constants, defined in the cuckoo paper
const MAX_LOAD = {
  1: 0.5,
  2: 0.84,
  4: 0.95,
  8: 0.98
}

function calculateBucketSize (errorRate: number = 0.001): 2 | 4 | 8 {
  if (errorRate > 0.002) {
    return 2
  }

  if (errorRate > 0.00001) {
    return 4
  }

  return 8
}

export function optimize (maxItems: number, errorRate: number = 0.001): CuckooFilterInit {
  // https://www.eecs.harvard.edu/~michaelm/postscripts/cuckoo-conext2014.pdf
  // Section 5.1 Optimal Bucket Size
  const bucketSize = calculateBucketSize(errorRate)
  const load = MAX_LOAD[bucketSize]

  // https://stackoverflow.com/questions/57555236/how-to-size-a-cuckoo-filter/57617208#57617208
  const filterSize = Math.round(maxItems / load)
  const fingerprintSize = Math.min(Math.ceil(Math.log2(1 / errorRate) + Math.log2(2 * bucketSize)), MAX_FINGERPRINT_SIZE)

  return {
    filterSize,
    bucketSize,
    fingerprintSize
  }
}

export function createCuckooFilter (maxItems: number, errorRate: number = 0.005): Filter {
  const opts = optimize(maxItems, errorRate)
  return new CuckooFilter(opts)
}
