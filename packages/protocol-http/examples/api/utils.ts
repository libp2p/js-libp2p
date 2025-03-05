import type { Logger } from '@libp2p/interface'

/**
 * Convert an async event handler to a synchronous one that handles errors
 */
export function handleAsyncEvent<T> (
  fn: (...args: any[]) => Promise<void>,
  logger?: Logger
): (...args: any[]) => void {
  return (...args: any[]) => {
    fn(...args).catch(err => {
      if (logger?.error != null) {
        logger.error('Error in event handler:', err)
      }
    })
  }
}

/**
 * Check if a value is not null or undefined
 */
export function isPresent<T> (value: T | null | undefined): value is T {
  return value != null
}

/**
 * Ensure a string is not empty
 */
export function isNonEmptyString (value: string | null | undefined): value is string {
  return typeof value === 'string' && value !== ''
}