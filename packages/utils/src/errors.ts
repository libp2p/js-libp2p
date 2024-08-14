import type { RateLimiterResult } from './rate-limiter.js'

/**
 * A rate limit was hit
 */
export class RateLimitError extends Error {
  remainingPoints: number
  msBeforeNext: number
  consumedPoints: number
  isFirstInDuration: boolean

  constructor (message = 'Rate limit exceeded', props: RateLimiterResult) {
    super(message)
    this.name = 'RateLimitError'
    this.remainingPoints = props.remainingPoints
    this.msBeforeNext = props.msBeforeNext
    this.consumedPoints = props.consumedPoints
    this.isFirstInDuration = props.isFirstInDuration
  }
}
