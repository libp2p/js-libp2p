import delay from 'delay'
import { RateLimitError } from './errors.js'

export interface RateLimiterInit {
  /**
   * Number of points
   *
   * @default 4
   */
  points?: number

  /**
   * Per seconds
   *
   * @default 1
   */
  duration?: number

  /**
   * Block if consumed more than points in current duration for blockDuration seconds
   *
   * @default 0
   */
  blockDuration?: number

  /**
   * Execute allowed actions evenly over duration
   *
   * @default false
   */
  execEvenly?: boolean

  /**
   * ms, works with execEvenly=true option
   *
   * @default duration * 1000 / points
   */
  execEvenlyMinDelayMs?: number

  /**
   * @default "rlflx"
   */
  keyPrefix?: string
}

export interface GetKeySecDurationOptions {
  customDuration?: number
}

export interface RateLimiterResult {
  remainingPoints: number
  msBeforeNext: number
  consumedPoints: number
  isFirstInDuration: boolean
}

export interface RateRecord {
  value: number
  expiresAt?: Date
  timeoutId?: ReturnType<typeof setTimeout>
}

export class RateLimiter {
  public readonly memoryStorage: MemoryStorage
  protected points: number
  protected duration: number
  protected blockDuration: number
  protected execEvenly: boolean
  protected execEvenlyMinDelayMs: number
  protected keyPrefix: string

  constructor (opts: RateLimiterInit = {}) {
    this.points = opts.points ?? 4
    this.duration = opts.duration ?? 1
    this.blockDuration = opts.blockDuration ?? 0
    this.execEvenly = opts.execEvenly ?? false
    this.execEvenlyMinDelayMs = opts.execEvenlyMinDelayMs ?? (this.duration * 1000 / this.points)
    this.keyPrefix = opts.keyPrefix ?? 'rlflx'
    this.memoryStorage = new MemoryStorage()
  }

  async consume (key: string, pointsToConsume: number = 1, options: GetKeySecDurationOptions = {}): Promise<RateLimiterResult> {
    const rlKey = this.getKey(key)
    const secDuration = this._getKeySecDuration(options)
    let res = this.memoryStorage.incrby(rlKey, pointsToConsume, secDuration)
    res.remainingPoints = Math.max(this.points - res.consumedPoints, 0)

    if (res.consumedPoints > this.points) {
      // Block only first time when consumed more than points
      if (this.blockDuration > 0 && res.consumedPoints <= (this.points + pointsToConsume)) {
        // Block key
        res = this.memoryStorage.set(rlKey, res.consumedPoints, this.blockDuration)
      }

      throw new RateLimitError('Rate limit exceeded', res)
    } else if (this.execEvenly && res.msBeforeNext > 0 && !res.isFirstInDuration) {
      // Execute evenly
      let delayMs = Math.ceil(res.msBeforeNext / (res.remainingPoints + 2))
      if (delayMs < this.execEvenlyMinDelayMs) {
        delayMs = res.consumedPoints * this.execEvenlyMinDelayMs
      }

      await delay(delayMs)
    }

    return res
  }

  penalty (key: string, points: number = 1, options: GetKeySecDurationOptions = {}): RateLimiterResult {
    const rlKey = this.getKey(key)
    const secDuration = this._getKeySecDuration(options)
    const res = this.memoryStorage.incrby(rlKey, points, secDuration)
    res.remainingPoints = Math.max(this.points - res.consumedPoints, 0)

    return res
  }

  reward (key: string, points: number = 1, options: GetKeySecDurationOptions = {}): RateLimiterResult {
    const rlKey = this.getKey(key)
    const secDuration = this._getKeySecDuration(options)
    const res = this.memoryStorage.incrby(rlKey, -points, secDuration)
    res.remainingPoints = Math.max(this.points - res.consumedPoints, 0)

    return res
  }

  /**
   * Block any key for secDuration seconds
   *
   * @param key
   * @param secDuration
   */
  block (key: string, secDuration: number): RateLimiterResult {
    const msDuration = secDuration * 1000
    const initPoints = this.points + 1

    this.memoryStorage.set(this.getKey(key), initPoints, secDuration)

    return {
      remainingPoints: 0,
      msBeforeNext: msDuration === 0 ? -1 : msDuration,
      consumedPoints: initPoints,
      isFirstInDuration: false
    }
  }

  set (key: string, points: number, secDuration: number = 0): RateLimiterResult {
    const msDuration = (secDuration >= 0 ? secDuration : this.duration) * 1000

    this.memoryStorage.set(this.getKey(key), points, secDuration)

    return {
      remainingPoints: 0,
      msBeforeNext: msDuration === 0 ? -1 : msDuration,
      consumedPoints: points,
      isFirstInDuration: false
    }
  }

  get (key: string): RateLimiterResult | undefined {
    const res = this.memoryStorage.get(this.getKey(key))

    if (res != null) {
      res.remainingPoints = Math.max(this.points - res.consumedPoints, 0)
    }

    return res
  }

  delete (key: string): void {
    this.memoryStorage.delete(this.getKey(key))
  }

  private _getKeySecDuration (options?: GetKeySecDurationOptions): number {
    if (options?.customDuration != null && options.customDuration >= 0) {
      return options.customDuration
    }

    return this.duration
  }

  getKey (key: string): string {
    return this.keyPrefix.length > 0 ? `${this.keyPrefix}:${key}` : key
  }

  parseKey (rlKey: string): string {
    return rlKey.substring(this.keyPrefix.length)
  }
}

export class MemoryStorage {
  public readonly storage: Map<string, RateRecord>

  constructor () {
    this.storage = new Map()
  }

  incrby (key: string, value: number, durationSec: number): RateLimiterResult {
    const existing = this.storage.get(key)

    if (existing != null) {
      const msBeforeExpires = existing.expiresAt != null
        ? existing.expiresAt.getTime() - new Date().getTime()
        : -1

      if (existing.expiresAt == null || msBeforeExpires > 0) {
        // Change value
        existing.value += value

        return {
          remainingPoints: 0,
          msBeforeNext: msBeforeExpires,
          consumedPoints: existing.value,
          isFirstInDuration: false
        }
      }

      return this.set(key, value, durationSec)
    }

    return this.set(key, value, durationSec)
  }

  set (key: string, value: number, durationSec: number): RateLimiterResult {
    const durationMs = durationSec * 1000
    const existing = this.storage.get(key)

    if (existing != null) {
      clearTimeout(existing.timeoutId)
    }

    const record: RateRecord = {
      value,
      expiresAt: durationMs > 0 ? new Date(Date.now() + durationMs) : undefined
    }

    this.storage.set(key, record)

    if (durationMs > 0) {
      record.timeoutId = setTimeout(() => {
        this.storage.delete(key)
      }, durationMs)

      if (record.timeoutId.unref != null) {
        record.timeoutId.unref()
      }
    }

    return {
      remainingPoints: 0,
      msBeforeNext: durationMs === 0 ? -1 : durationMs,
      consumedPoints: record.value,
      isFirstInDuration: true
    }
  }

  get (key: string): RateLimiterResult | undefined {
    const existing = this.storage.get(key)

    if (existing != null) {
      const msBeforeExpires = existing.expiresAt != null
        ? existing.expiresAt.getTime() - new Date().getTime()
        : -1
      return {
        remainingPoints: 0,
        msBeforeNext: msBeforeExpires,
        consumedPoints: existing.value,
        isFirstInDuration: false
      }
    }
  }

  delete (key: string): boolean {
    const record = this.storage.get(key)

    if (record != null) {
      if (record.timeoutId != null) {
        clearTimeout(record.timeoutId)
      }

      this.storage.delete(key)

      return true
    }
    return false
  }
}
