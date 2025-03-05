import { WebSocketFrame, OpCode } from '../pb/http.js'
import type { Logger } from '@libp2p/interface'

/**
 * Manages WebSocket keep-alive with ping/pong frames
 */
export class WebSocketKeepAlive {
  private readonly pb: any // protobuf stream
  private readonly signal: AbortSignal
  private readonly log: Logger
  private readonly keepAliveIntervalMs: number
  private readonly pingTimeoutMs: number
  private interval: NodeJS.Timeout | null = null
  private lastPingTime: number = 0
  private awaitingPong: boolean = false

  constructor (
    pb: any,
    signal: AbortSignal,
    log: Logger,
    options: { keepAliveInterval: number, pingTimeout: number }
  ) {
    this.pb = pb
    this.signal = signal
    this.log = log
    this.keepAliveIntervalMs = options.keepAliveInterval
    this.pingTimeoutMs = options.pingTimeout
  }

  /**
   * Start the keep-alive mechanism
   */
  startKeepAlive (): void {
    if (this.keepAliveIntervalMs <= 0 || this.interval != null) {
      return
    }

    this.interval = setInterval(() => {
      this.sendPing().catch(err => {
        this.log.error('Error sending ping: %e', err)
      })
    }, this.keepAliveIntervalMs)
  }

  /**
   * Send a ping frame
   */
  async sendPing (): Promise<void> {
    if (this.signal.aborted) {
      return
    }

    if (this.awaitingPong) {
      const timeSinceLastPing = Date.now() - this.lastPingTime

      if (timeSinceLastPing > this.pingTimeoutMs) {
        this.log.error('Ping timeout after %d ms', timeSinceLastPing)
        // Close connection would be handled by stream handler
        return
      }
    }

    try {
      // Create a ping frame with current timestamp as payload
      const pingFrame: WebSocketFrame = {
        fin: true,
        opCode: OpCode.PING,
        mask: false,
        payload: new Uint8Array(0)
      }

      await this.pb.write(pingFrame, WebSocketFrame, { signal: this.signal })

      this.lastPingTime = Date.now()
      this.awaitingPong = true

      this.log.trace('ping sent')
    } catch (err) {
      this.log.error('Error sending ping: %e', err)
    }
  }

  /**
   * Handle a pong frame
   */
  handlePongFrame (frame: WebSocketFrame): void {
    this.awaitingPong = false

    const roundTripTime = Date.now() - this.lastPingTime
    this.log.trace('pong received (rtt: %dms)', roundTripTime)
  }

  /**
   * Clean up resources
   */
  cleanup (): void {
    if (this.interval != null) {
      clearInterval(this.interval)
      this.interval = null
    }
  }
}
