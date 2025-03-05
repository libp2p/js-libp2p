import { type WebSocketFrame, OpCode } from './pb/http.js'
import { type OptimizedWebSocketEventHandler } from './utils/websocket-event-handler-optimized.js'
import type { Logger } from '@libp2p/interface'

/**
 * Handles WebSocket frame creation and processing
 */
export class WebSocketFrameHandler {
  private readonly log: Logger
  private readonly eventHandlers: Record<string, OptimizedWebSocketEventHandler> = {}

  constructor (log: Logger) {
    this.log = log
  }

  /**
   * Register an event handler for a WebSocket
   */
  registerEventHandler (target: EventTarget, eventHandler: OptimizedWebSocketEventHandler): void {
    // Use a unique ID to associate the target with its handler
    const id = Math.random().toString(36).substring(2)
    const targetId = typeof (target as any)._id === 'string' ? (target as any)._id : ((target as any)._id = id)
    this.eventHandlers[targetId] = eventHandler
  }

  /**
   * Get the event handler for a WebSocket target
   */
  private getEventHandler (target: EventTarget): OptimizedWebSocketEventHandler | undefined {
    const targetId = (target as any)._id
    return typeof targetId === 'string' ? this.eventHandlers[targetId] : undefined
  }

  /**
   * Create a text frame
   */
  createTextFrame (text: string, fragmentationThreshold: number): WebSocketFrame[] {
    const textBytes = new TextEncoder().encode(text)
    return this.createFragmentedFrames(
      textBytes,
      OpCode.TEXT,
      fragmentationThreshold
    )
  }

  /**
   * Create a binary frame
   */
  createBinaryFrame (data: Uint8Array, fragmentationThreshold: number): WebSocketFrame[] {
    return this.createFragmentedFrames(
      data,
      OpCode.BINARY,
      fragmentationThreshold
    )
  }

  /**
   * Create a close frame
   */
  createCloseFrame (code: number, reason: string): WebSocketFrame {
    const reasonLength = reason === '' ? 0 : new TextEncoder().encode(reason).length
    const payload = new Uint8Array(2 + reasonLength)

    // Status code (2 bytes)
    payload[0] = (code >> 8) & 0xFF
    payload[1] = code & 0xFF

    // Reason text (UTF-8 encoded)
    if (reason !== '') {
      const reasonBytes = new TextEncoder().encode(reason)
      payload.set(reasonBytes, 2)
    }

    return {
      fin: true,
      opCode: OpCode.CLOSE,
      mask: false,
      payload
    }
  }

  /**
   * Create a ping frame
   */
  createPingFrame (data: Uint8Array = new Uint8Array(0)): WebSocketFrame {
    return {
      fin: true,
      opCode: OpCode.PING,
      mask: false,
      payload: data
    }
  }

  /**
   * Create a pong frame
   */
  createPongFrame (data: Uint8Array = new Uint8Array(0)): WebSocketFrame {
    return {
      fin: true,
      opCode: OpCode.PONG,
      mask: false,
      payload: data
    }
  }

  /**
   * Handle a text frame
   */
  handleTextFrame (frame: WebSocketFrame, target: EventTarget, url: string): void {
    try {
      const text = new TextDecoder().decode(frame.payload ?? new Uint8Array(0))

      const eventHandler = this.getEventHandler(target)
      if (eventHandler != null) {
        eventHandler.dispatchTextMessageEvent(text)
      } else {
        // Fallback if no event handler is registered
        const event = new MessageEvent('message', {
          data: text,
          origin: url
        })
        target.dispatchEvent(event)
      }
    } catch (err) {
      this.log.error('Error handling text frame: %e', err)
    }
  }

  /**
   * Handle a binary frame
   */
  handleBinaryFrame (frame: WebSocketFrame, target: EventTarget, url: string): void {
    try {
      const eventHandler = this.getEventHandler(target)
      if (eventHandler != null) {
        eventHandler.dispatchBinaryMessageEvent(frame.payload ?? new Uint8Array(0))
      } else {
        // Fallback if no event handler is registered
        const event = new MessageEvent('message', {
          data: frame.payload ?? new Uint8Array(0),
          origin: url
        })
        target.dispatchEvent(event)
      }
    } catch (err) {
      this.log.error('Error handling binary frame: %e', err)
    }
  }

  /**
   * Handle a close frame
   */
  handleCloseFrame (frame: WebSocketFrame, target: EventTarget): { code: number, reason: string } {
    let code = 1005 // Default: No Status Received
    let reason = ''

    const payload = frame.payload ?? new Uint8Array(0)

    if (payload.length >= 2) {
      code = (payload[0] << 8) | payload[1]

      if (payload.length > 2) {
        try {
          reason = new TextDecoder().decode(payload.subarray(2))
        } catch (err) {
          this.log.error('Error decoding close reason: %e', err)
        }
      }
    }

    return { code, reason }
  }

  /**
   * Create fragmented frames if the data exceeds the fragmentation threshold
   */
  private createFragmentedFrames (
    data: Uint8Array,
    opCode: OpCode,
    fragmentationThreshold: number
  ): WebSocketFrame[] {
    // If data is small enough, send as a single frame
    if (data.length <= fragmentationThreshold) {
      return [{
        fin: true,
        opCode,
        mask: false,
        payload: data
      }]
    }

    // Otherwise, fragment the message
    const frames: WebSocketFrame[] = []
    let offset = 0

    // Add the first frame with the actual opCode
    const firstChunk = data.subarray(0, fragmentationThreshold)
    frames.push({
      fin: false,
      opCode,
      mask: false,
      payload: firstChunk
    })

    offset += fragmentationThreshold

    // Add continuation frames
    while (offset < data.length) {
      const remaining = data.length - offset
      const chunkSize = Math.min(remaining, fragmentationThreshold)
      const chunk = data.subarray(offset, offset + chunkSize)
      const isLastChunk = offset + chunkSize >= data.length

      frames.push({
        fin: isLastChunk,
        opCode: OpCode.CONTINUATION,
        mask: false,
        payload: chunk
      })

      offset += chunkSize
    }

    return frames
  }
}
