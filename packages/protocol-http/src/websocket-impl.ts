import { AbortError } from '@libp2p/interface'
import { Request, Response, WebSocketFrame } from './pb/http.js'
import { WebSocketFrameHandler } from './websocket-frame-handler.js'
import { WebSocketKeepAlive } from './utils/websocket-keep-alive.js'
import { OptimizedWebSocketEventHandler } from './utils/websocket-event-handler-optimized.js'
import { WebSocketStreamHandler } from './utils/websocket-stream-handler.js'
import { WebSocketConfigManager, type WebSocketOptions } from './utils/websocket-config-manager.js'
import { WebSocketSignalHandler } from './utils/websocket-signal-handler.js'
import {
  WEBSOCKET_CONNECTING,
  WEBSOCKET_OPEN,
  WEBSOCKET_CLOSING,
  WEBSOCKET_CLOSED
} from './constants.js'
import type { WebSocket } from './interfaces.js'
import type { Logger } from '@libp2p/interface'

/**
 * WebSocket implementation for libp2p HTTP
 * Provides a standard WebSocket API over libp2p streams
 */
export class WebSocketImpl extends EventTarget implements WebSocket {
  private readonly pb: any // protobuf stream
  private readonly log: Logger
  private _readyState: number
  private readonly _url: string
  private closed: boolean
  
  private readonly frameHandler: WebSocketFrameHandler
  private readonly keepAlive: WebSocketKeepAlive
  private readonly eventHandler: OptimizedWebSocketEventHandler
  private readonly streamHandler: WebSocketStreamHandler
  private readonly configManager: WebSocketConfigManager
  private readonly signalHandler: WebSocketSignalHandler
  
  // Callback used by WebSocketStreamHandler to initiate closure
  readonly handleCloseCallback: (code: number, reason: string) => Promise<void>
  
  // WebSocket ready states (copied from WebSocket standard)
  static readonly CONNECTING = WEBSOCKET_CONNECTING
  static readonly OPEN = WEBSOCKET_OPEN
  static readonly CLOSING = WEBSOCKET_CLOSING
  static readonly CLOSED = WEBSOCKET_CLOSED
  
  /**
   * Create a new WebSocket instance
   */
  constructor (
    pb: any,
    signal: AbortSignal,
    log: Logger,
    url = '',
    options: WebSocketOptions = {}
  ) {
    super()
    this.pb = pb
    this.log = log
    this._readyState = WebSocketImpl.CONNECTING
    this._url = url
    this.closed = false
    
    // Initialize configuration management
    this.configManager = new WebSocketConfigManager(options)
    
    // Create helper instances
    this.frameHandler = new WebSocketFrameHandler(log)
    this.keepAlive = new WebSocketKeepAlive(pb, signal, log, this.configManager.getKeepAliveConfig())
    this.eventHandler = new OptimizedWebSocketEventHandler(this, url)
    
    // Register the event handler with the frame handler for optimized event dispatching
    this.frameHandler.registerEventHandler(this, this.eventHandler)
    
    // Create a bound method for the stream handler to call back into this instance
    this.handleCloseCallback = this.handleClose.bind(this)
    
    // Initialize signal handler
    this.signalHandler = new WebSocketSignalHandler(signal, log, () => {
      this.cleanup()
      if (!this.closed) {
        this.handleClose(1001, 'Connection aborted').catch(err => {
          this.log.error('error handling websocket closure - %e', err)
        })
      }
    })
    
    // Create the stream handler
    this.streamHandler = new WebSocketStreamHandler(
      pb,
      signal,
      log,
      this,
      this.frameHandler,
      this.keepAlive,
      this.eventHandler,
      url
    )
    
    // Start reading frames in the next microtask to ensure the constructor completes
    // with the WebSocket in CONNECTING state
    setTimeout(() => {
      this.streamHandler.startReading(() => this.closed).catch(err => {
        this.log.error('error in websocket message loop - %e', err)
        this.handleClose(1006, 'Abnormal closure').catch(err => {
          this.log.error('error handling websocket closure - %e', err)
        })
      })
    }, 0)
  }

  /**
   * Current ready state
   */
  get readyState (): number {
    return this._readyState
  }

  /**
   * WebSocket URL
   */
  get url (): string {
    return this._url
  }

  /**
   * Internal method to handle WebSocket closure
   */
  async handleClose (code: number, reason: string): Promise<void> {
    if (this.closed) {
      return
    }
    
    this._readyState = WebSocketImpl.CLOSED
    this.closed = true
    
    // Clean up resources
    this.cleanup()
    
    // Send close frame if we initiated the close and connection is still open
    if (this._readyState !== WebSocketImpl.CONNECTING && !this.signalHandler.isAborted()) {
      try {
        const closeFrame = this.frameHandler.createCloseFrame(code, reason)
        await this.pb.write(closeFrame, WebSocketFrame, { signal: this.signalHandler })
      } catch (err) {
        this.log.error('failed to send close frame - %e', err)
      }
    }
    
    this.eventHandler.dispatchCloseEvent(code, reason)
  }

  /**
   * Clean up resources
   */
  private cleanup(): void {
    // Stop keep-alive mechanism
    this.keepAlive.cleanup()
    
    // Clean up signal handler
    this.signalHandler.cleanup()
  }

  /**
   * Send data over the WebSocket
   */
  async send (data: string | Uint8Array): Promise<void> {
    if (this._readyState !== WebSocketImpl.OPEN) {
      throw new Error('WebSocket is not open')
    }
    
    if (this.signalHandler.isAborted()) {
      throw new AbortError()
    }
    
    try {
      let frames: WebSocketFrame[]
      
      if (typeof data === 'string') {
        // Send as text frame(s)
        frames = this.frameHandler.createTextFrame(data, this.configManager.getFragmentationThreshold())
      } else {
        // Send as binary frame(s)
        frames = this.frameHandler.createBinaryFrame(data, this.configManager.getFragmentationThreshold())
      }
      
      // Send all frames sequentially
      for (const frame of frames) {
        await this.pb.write(frame, WebSocketFrame)
      }
    } catch (err: any) {
      this.log.error('error sending websocket message - %e', err)
      
      if (!this.closed) {
        await this.handleClose(1006, 'Abnormal closure')
      }
      
      throw err
    }
  }

  /**
   * Close the WebSocket connection
   */
  async close (code = 1000, reason = ''): Promise<void> {
    if (this._readyState === WebSocketImpl.CLOSED || this._readyState === WebSocketImpl.CLOSING) {
      return
    }
    
    this._readyState = WebSocketImpl.CLOSING
    
    try {
      await this.handleClose(code, reason)
    } catch (err: any) {
      this.log.error('error closing websocket - %e', err)
      throw err
    }
  }
}
