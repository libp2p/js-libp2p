/**
 * @packageDocumentation
 *
 * An implementation of the HTTP protocol over WebSockets for libp2p
 *
 * @example
 *
 * ```typescript
 * // HTTP Service example
 * import { createLibp2p } from 'libp2p'
 * import { http } from '@libp2p/http'
 *
 * const libp2p = await createLibp2p({
 *   services: {
 *     http: http()
 *   }
 * })
 * 
 * // Now you can use HTTP over libp2p
 * const response = await libp2p.services.http.fetch('libp2p://QmPeer/resource')
 * ```
 *
 * ```typescript
 * // WebSocket implementation example
 * import { createLibp2p } from 'libp2p'
 * import { webSocketHttp } from '@libp2p/http'
 *
 * // Use the WebSocket implementation
 * const ws = webSocketHttp(stream, abortSignal, logger)
 * 
 * // Send a message
 * await ws.send('Hello world')
 * 
 * // Close the connection
 * await ws.close()
 * ```
 */

import { WebSocketImpl } from './websocket-impl.js'
import { http } from './http-service.js'
import type { WebSocket, WebSocketOptions } from './interfaces.js'
import type { Logger } from '@libp2p/interface'

/**
 * Create a new WebSocket implementation over a libp2p stream
 */
export function webSocketHttp (
  stream: any,
  signal: AbortSignal, 
  logger: Logger,
  url?: string,
  options?: WebSocketOptions
): WebSocket {
  return new WebSocketImpl(stream, signal, logger, url, options)
}

// Export WebSocket constants
export {
  WEBSOCKET_CONNECTING,
  WEBSOCKET_OPEN,
  WEBSOCKET_CLOSING,
  WEBSOCKET_CLOSED
} from './constants.js'

// Export HTTP service function
export { http } from './http-service.js'

// Export interfaces and types
export * from './interfaces.js'
export * from './constants.js'
