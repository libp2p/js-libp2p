import {
  DEFAULT_WEBSOCKET_KEEP_ALIVE_INTERVAL,
  DEFAULT_WEBSOCKET_PING_TIMEOUT,
  DEFAULT_WEBSOCKET_FRAGMENTATION_THRESHOLD
} from '../constants.js'

/**
 * WebSocket configuration options
 */
export interface WebSocketOptions {
  keepAliveIntervalMs?: number
  pingTimeoutMs?: number
  fragmentationThreshold?: number
}

/**
 * Manages WebSocket configuration options
 * Centralizes all configuration handling for WebSocket implementations
 */
export class WebSocketConfigManager {
  private readonly keepAliveInterval: number
  private readonly pingTimeout: number
  private readonly fragmentationThreshold: number

  /**
   * Create a new WebSocketConfigManager with the given options
   */
  constructor(options: WebSocketOptions = {}) {
    // Initialize with defaults or provided values
    this.keepAliveInterval = options.keepAliveIntervalMs ?? DEFAULT_WEBSOCKET_KEEP_ALIVE_INTERVAL
    this.pingTimeout = options.pingTimeoutMs ?? DEFAULT_WEBSOCKET_PING_TIMEOUT
    this.fragmentationThreshold = options.fragmentationThreshold ?? DEFAULT_WEBSOCKET_FRAGMENTATION_THRESHOLD
  }

  /**
   * Get the keep-alive interval in milliseconds
   */
  getKeepAliveInterval(): number {
    return this.keepAliveInterval
  }

  /**
   * Get the ping timeout in milliseconds
   */
  getPingTimeout(): number {
    return this.pingTimeout
  }

  /**
   * Get the fragmentation threshold in bytes
   */
  getFragmentationThreshold(): number {
    return this.fragmentationThreshold
  }

  /**
   * Return a configuration object for WebSocketKeepAlive
   */
  getKeepAliveConfig(): { keepAliveInterval: number, pingTimeout: number } {
    return {
      keepAliveInterval: this.keepAliveInterval,
      pingTimeout: this.pingTimeout
    }
  }

  /**
   * Check if keep-alive is enabled
   */
  isKeepAliveEnabled(): boolean {
    return this.keepAliveInterval > 0
  }
}
