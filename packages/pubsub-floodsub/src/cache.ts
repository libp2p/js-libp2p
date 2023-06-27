interface SimpleTimeCacheOpts {
  validityMs: number
}

interface CacheValue<T> {
  value: T
  validUntilMs: number
}

/**
 * This is similar to https://github.com/daviddias/time-cache/blob/master/src/index.js
 * for our own need, we don't use lodash throttle to improve performance.
 * This gives 4x - 5x performance gain compared to npm TimeCache
 */
export class SimpleTimeCache<T> {
  private entries: Map<string, CacheValue<T>>
  private readonly validityMs: number
  private lastPruneTime = 0

  constructor (options: SimpleTimeCacheOpts) {
    this.entries = new Map()
    this.validityMs = options.validityMs

    // allow negative validityMs so that this does not cache anything, spec test compliance.spec.js
    // sends duplicate messages and expect peer to receive all. Application likely uses positive validityMs
  }

  put (key: string, value: T): void {
    this.entries.set(key, { value, validUntilMs: Date.now() + this.validityMs })
    this.prune()
  }

  prune (): void {
    const now = Date.now()
    if (now - this.lastPruneTime < 200) {
      return
    }
    this.lastPruneTime = now

    for (const [k, v] of this.entries.entries()) {
      if (v.validUntilMs < now) {
        this.entries.delete(k)
      } else {
        // sort by insertion order
        break
      }
    }
  }

  has (key: string): boolean {
    return this.entries.has(key)
  }

  get (key: string): T | undefined {
    const value = this.entries.get(key)
    return (value != null && value.validUntilMs >= Date.now()) ? value.value : undefined
  }

  clear (): void {
    this.entries = new Map()
    this.lastPruneTime = 0
  }
}
