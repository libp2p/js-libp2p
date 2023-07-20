type SimpleTimeCacheOpts = {
  validityMs: number
}

type CacheValue<T> = {
  value: T
  validUntilMs: number
}

/**
 * This is similar to https://github.com/daviddias/time-cache/blob/master/src/index.js
 * for our own need, we don't use lodash throttle to improve performance.
 * This gives 4x - 5x performance gain compared to npm TimeCache
 */
export class SimpleTimeCache<T> {
  private readonly entries = new Map<string | number, CacheValue<T>>()
  private readonly validityMs: number

  constructor(opts: SimpleTimeCacheOpts) {
    this.validityMs = opts.validityMs

    // allow negative validityMs so that this does not cache anything, spec test compliance.spec.js
    // sends duplicate messages and expect peer to receive all. Application likely uses positive validityMs
  }

  get size(): number {
    return this.entries.size
  }

  /** Returns true if there was a key collision and the entry is dropped */
  put(key: string | number, value: T): boolean {
    if (this.entries.has(key)) {
      // Key collisions break insertion order in the entries cache, which break prune logic.
      // prune relies on each iterated entry to have strictly ascending validUntilMs, else it
      // won't prune expired entries and SimpleTimeCache will grow unexpectedly.
      // As of Oct 2022 NodeJS v16, inserting the same key twice with different value does not
      // change the key position in the iterator stream. A unit test asserts this behaviour.
      return true
    }

    this.entries.set(key, { value, validUntilMs: Date.now() + this.validityMs })
    return false
  }

  prune(): void {
    const now = Date.now()

    for (const [k, v] of this.entries.entries()) {
      if (v.validUntilMs < now) {
        this.entries.delete(k)
      } else {
        // Entries are inserted with strictly ascending validUntilMs.
        // Stop early to save iterations
        break
      }
    }
  }

  has(key: string): boolean {
    return this.entries.has(key)
  }

  get(key: string | number): T | undefined {
    const value = this.entries.get(key)
    return value && value.validUntilMs >= Date.now() ? value.value : undefined
  }

  clear(): void {
    this.entries.clear()
  }
}
