/**
 * Event polyfills for Node.js environment
 * These are needed because Node.js doesn't natively support browser-style events
 */

interface EventPolyfillOptions {
  bubbles?: boolean
  cancelable?: boolean
  composed?: boolean
  target?: any
}

interface MessageEventPolyfillOptions extends EventPolyfillOptions {
  data?: any
  origin?: string
  lastEventId?: string
  source?: any
  ports?: any[]
}

interface CloseEventPolyfillOptions extends EventPolyfillOptions {
  code?: number
  reason?: string
  wasClean?: boolean
}

interface ErrorEventPolyfillOptions extends EventPolyfillOptions {
  message?: string
  error?: Error
  filename?: string
  lineno?: number
  colno?: number
}

/**
 * Basic Event implementation for Node.js
 */
class EventPolyfill {
  type: string
  bubbles: boolean
  cancelable: boolean
  composed: boolean
  timeStamp: number
  defaultPrevented: boolean
  currentTarget: any
  target: any
  srcElement: any
  returnValue: boolean
  cancelBubble: boolean
  path: any[]
  immediatePropagationStopped?: boolean

  constructor (type: string, options: EventPolyfillOptions = {}) {
    this.type = type
    this.bubbles = options.bubbles ?? false
    this.cancelable = options.cancelable ?? false
    this.composed = options.composed ?? false
    this.timeStamp = Date.now()
    this.defaultPrevented = false
    this.currentTarget = null
    this.target = options.target ?? null
    this.srcElement = null
    this.returnValue = true
    this.cancelBubble = false
    this.path = []
  }

  preventDefault (): void {
    if (this.cancelable) {
      this.defaultPrevented = true
    }
  }

  stopPropagation (): void {
    this.cancelBubble = true
  }

  stopImmediatePropagation (): void {
    this.cancelBubble = true
    this.immediatePropagationStopped = true
  }
}

/**
 * MessageEvent implementation for Node.js
 */
class MessageEventPolyfill extends EventPolyfill {
  data: any
  origin: string
  lastEventId: string
  source: any
  ports: any[]

  constructor (type: string, options: MessageEventPolyfillOptions = {}) {
    super(type, options)
    this.data = options.data ?? null
    this.origin = options.origin ?? ''
    this.lastEventId = options.lastEventId ?? ''
    this.source = options.source ?? null
    this.ports = options.ports ?? []
  }
}

/**
 * CloseEvent implementation for Node.js
 */
class CloseEventPolyfill extends EventPolyfill {
  code: number
  reason: string
  wasClean: boolean

  constructor (type: string, options: CloseEventPolyfillOptions = {}) {
    super(type, options)
    this.code = options.code ?? 1000
    this.reason = options.reason ?? ''
    this.wasClean = options.wasClean ?? false
  }
}

/**
 * ErrorEvent implementation for Node.js
 */
class ErrorEventPolyfill extends EventPolyfill {
  message: string
  error: Error
  filename: string
  lineno: number
  colno: number

  constructor (type: string, options: ErrorEventPolyfillOptions = {}) {
    super(type, options)
    this.message = options.message ?? ''
    this.error = options.error ?? new Error(this.message)
    this.filename = options.filename ?? ''
    this.lineno = options.lineno ?? 0
    this.colno = options.colno ?? 0
  }
}

// Export named exports for ES modules
export const Event = typeof globalThis.Event !== 'undefined' ? globalThis.Event : EventPolyfill
export const MessageEvent = typeof globalThis.MessageEvent !== 'undefined' ? globalThis.MessageEvent : MessageEventPolyfill
export const CloseEvent = typeof globalThis.CloseEvent !== 'undefined' ? globalThis.CloseEvent : CloseEventPolyfill
export const ErrorEvent = typeof globalThis.ErrorEvent !== 'undefined' ? globalThis.ErrorEvent : ErrorEventPolyfill

// Also export the polyfill classes directly in case they're needed
export {
  EventPolyfill,
  MessageEventPolyfill,
  CloseEventPolyfill,
  ErrorEventPolyfill
}
