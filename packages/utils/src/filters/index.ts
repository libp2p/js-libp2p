export { BloomFilter, createBloomFilter, type BloomFilterOptions } from './bloom-filter.ts'
export { CuckooFilter, createCuckooFilter, type CuckooFilterInit } from './cuckoo-filter.ts'
export { ScalableCuckooFilter, createScalableCuckooFilter, type ScalableCuckooFilterInit } from './scalable-cuckoo-filter.ts'
export type { Bucket } from './bucket.ts'
export type { Fingerprint } from './fingerprint.ts'
export type { Hash } from './hashes.ts'

export interface Filter {
  add(item: Uint8Array | string): void
  has(item: Uint8Array | string): boolean
  remove?(buf: Uint8Array | string): boolean
}
