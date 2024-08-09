export { BloomFilter, createBloomFilter, type BloomFilterOptions } from './bloom-filter.js'
export { CuckooFilter, createCuckooFilter, type CuckooFilterInit } from './cuckoo-filter.js'
export { ScalableCuckooFilter, createScalableCuckooFilter, type ScalableCuckooFilterInit } from './scalable-cuckoo-filter.js'

export interface Filter {
  add(item: Uint8Array | string): void
  has(item: Uint8Array | string): boolean
  remove?(buf: Uint8Array | string): boolean
}
