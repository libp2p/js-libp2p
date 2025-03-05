import type { Logger } from '@libp2p/interface'

/**
 * Handles WebSocket abort signal lifecycle
 * Centralizes abort signal handling logic and cleanup
 */
export class WebSocketSignalHandler {
  private readonly signal: AbortSignal
  private readonly log: Logger
  private readonly onAbort: () => void
  private aborted: boolean = false
  private cleanupFunction: (() => void) | null = null

  /**
   * Create a new WebSocketSignalHandler
   *
   * @param signal - The abort signal to monitor
   * @param log - Logger instance
   * @param onAbort - Callback to execute when abort is triggered
   */
  constructor (signal: AbortSignal, log: Logger, onAbort: () => void) {
    this.signal = signal
    this.log = log
    this.onAbort = onAbort

    // Initialize abort state
    this.aborted = signal.aborted

    // Define abort handler
    const abortHandler = () => {
      if (!this.aborted) {
        this.aborted = true

        if (typeof this.log.trace === 'function') {
          this.log.trace('abort signal received')
        }

        try {
          // Execute the provided callback immediately
          this.onAbort()
        } catch (err) {
          if (typeof this.log.error === 'function') {
            this.log.error('error in abort handler - %e', err)
          }
        }
      }
    }

    // If already aborted, call handler immediately
    if (this.aborted) {
      // Use setTimeout to make sure this happens asynchronously
      // to match the standard abort behavior
      setTimeout(abortHandler, 0)
    } else {
      // Listen for abort signal
      signal.addEventListener('abort', abortHandler)

      // Store cleanup function to remove listener later
      this.cleanupFunction = () => {
        try {
          signal.removeEventListener('abort', abortHandler)
        } catch (err) {
          // Ignore errors removing event listener
          // This can happen if the signal has been garbage collected
        }
      }
    }
  }

  /**
   * Check if the signal has been aborted
   */
  isAborted (): boolean {
    return this.aborted || this.signal.aborted
  }

  /**
   * Manually trigger the abort handler
   * Useful for testing or manual cleanup
   */
  triggerAbort (): void {
    if (!this.aborted) {
      this.aborted = true
      this.onAbort()
    }
  }

  /**
   * Clean up event listeners
   * Should be called when the WebSocket is closed
   */
  cleanup (): void {
    if (this.cleanupFunction != null) {
      this.cleanupFunction()
      this.cleanupFunction = null
    }
  }
}
