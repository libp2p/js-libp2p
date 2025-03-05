/**
 * WebSocket event handling helper
 * Creates and dispatches events for WebSocket instances
 *
 * Uses global Event classes which should be available in browser environments
 * or polyfilled in Node.js environments
 */

/**
 * Helper class to handle WebSocket events
 * Optimized to check for listeners before creating and dispatching events
 */
export class OptimizedWebSocketEventHandler {
  private readonly target: EventTarget
  private readonly url: string

  constructor (target: EventTarget, url: string = '') {
    this.target = target
    this.url = url

    // Setup event tracking to optimize event dispatching
    this.setupEventTracking()
  }

  /**
   * Check if the target has any listeners for the specified event type
   */
  private hasEventListeners (eventType: string): boolean {
    // For standard EventTarget we can't directly check for listeners
    // But for WebSocketImpl and most browsers, we can check via _listeners or similar

    // For Node.js EventEmitter or similar
    const hasListeners = (this.target as any).listenerCount?.(eventType) > 0

    // For DOM EventTarget in browsers that support getEventListeners
    const hasEventListeners = typeof (this.target as any).getEventListeners === 'function' &&
      (this.target as any).getEventListeners(eventType)?.length > 0

    // For our WebSocketImpl (assuming it tracks listeners internally)
    const hasInternalListeners = Array.isArray((this.target as any)._listeners?.[eventType]) &&
      (this.target as any)._listeners[eventType].length > 0

    // In testing/development, default to true to ensure events are always dispatched
    // In production, we could set a flag to make this more strict
    return hasListeners || hasEventListeners || hasInternalListeners || false
  }

  /**
   * Dispatch open event
   */
  dispatchOpenEvent (): void {
    if (!this.hasEventListeners('open')) {
      return // No listeners, skip event creation and dispatch
    }

    const event = new Event('open')
    this.target.dispatchEvent(event)
  }

  /**
   * Dispatch close event
   */
  dispatchCloseEvent (code: number, reason: string, wasClean: boolean = code === 1000): void {
    if (!this.hasEventListeners('close')) {
      return // No listeners, skip event creation and dispatch
    }

    // Use the global CloseEvent constructor (polyfilled if needed)
    const event = new CloseEvent('close', {
      code,
      reason,
      wasClean
    })

    this.target.dispatchEvent(event)
  }

  /**
   * Dispatch message event for text data
   */
  dispatchTextMessageEvent (data: string): void {
    if (!this.hasEventListeners('message')) {
      return // No listeners, skip event creation and dispatch
    }

    // Use the global MessageEvent constructor (polyfilled if needed)
    const event = new MessageEvent('message', {
      data,
      origin: this.url
    })

    this.target.dispatchEvent(event)
  }

  /**
   * Dispatch message event for binary data
   */
  dispatchBinaryMessageEvent (data: Uint8Array): void {
    if (!this.hasEventListeners('message')) {
      return // No listeners, skip event creation and dispatch
    }

    // Use the global MessageEvent constructor (polyfilled if needed)
    const event = new MessageEvent('message', {
      data,
      origin: this.url
    })

    this.target.dispatchEvent(event)
  }

  /**
   * Dispatch error event
   */
  dispatchErrorEvent (error: Error): void {
    if (!this.hasEventListeners('error')) {
      return // No listeners, skip event creation and dispatch
    }

    // Use the global ErrorEvent constructor (polyfilled if needed)
    const event = new ErrorEvent('error', {
      error,
      message: error.message
    })

    this.target.dispatchEvent(event)
  }

  /**
   * Register event tracking for the target
   * This adds internal tracking of event listeners to support optimizations
   */
  setupEventTracking (): void {
    // Store original addEventListener
    const originalAddEventListener = this.target.addEventListener
    const originalRemoveEventListener = this.target.removeEventListener

    // Create listener tracking if it doesn't exist
    if ((this.target as any)._listeners === undefined) {
      (this.target as any)._listeners = {}
    }

    // Override addEventListener to track listeners
    this.target.addEventListener = function (type, listener, options) {
      // Initialize array for this event type if needed
      if (!Array.isArray((this as any)._listeners[type])) {
        (this as any)._listeners[type] = []
      }

      // Add to tracking array
      (this as any)._listeners[type].push(listener)

      // Call original method
      originalAddEventListener.call(this, type, listener, options)
    }

    // Override removeEventListener to update tracking
    this.target.removeEventListener = function (type, listener, options) {
      // Remove from tracking array
      if (Array.isArray((this as any)._listeners[type])) {
        const index = (this as any)._listeners[type].indexOf(listener)
        if (index !== -1) {
          (this as any)._listeners[type].splice(index, 1)
        }
      }

      // Call original method
      originalRemoveEventListener.call(this, type, listener, options)
    }
  }

  /**
   * Get the number of listeners for an event type
   */
  getListenerCount (eventType: string): number {
    if (Array.isArray((this.target as any)._listeners?.[eventType])) {
      return (this.target as any)._listeners[eventType].length
    }
    return 0
  }
}
