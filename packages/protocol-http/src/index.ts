/**
 * @packageDocumentation
 *
 * An implementation of the HTTP/1.1 protocol for libp2p. It allows you to:
 * - Create HTTP servers that handle requests over libp2p connections
 * - Make HTTP requests to other libp2p nodes
 * - Use WebSocket connections over libp2p streams with full RFC 6455 compliance
 *
 * @example
 *
 * ```typescript
 * import { createLibp2p } from 'libp2p'
 * import { http } from '@libp2p/http'
 *
 * const node = await createLibp2p({
 *   services: {
 *     http: http()
 *   }
 * })
 *
 * const server = node.services.http.createServer()
 *
 * server.on('request', (request, response) => {
 *   response.writeHead(200, { 'Content-Type': 'text/plain' })
 *   response.end('Hello from libp2p HTTP server!')
 * })
 * ```
 *
 * @example
 *
 * ```typescript
 * // Make HTTP requests to other libp2p nodes
 * const response = await node.services.http.fetch('libp2p://QmPeerID/resource')
 * const text = await response.text()
 * console.log('Response:', text)
 * ```
 *
 * @example
 *
 * ```typescript
 * // WebSocket server implementation
 * server.on('request', async (request, response) => {
 *   if (node.services.http.isWebSocketRequest(request)) {
 *     const ws = await node.services.http.upgradeWebSocket(request, response)
 *
 *     ws.addEventListener('message', async event => {
 *       const text = event.data.toString()
 *       await ws.send(`Echo: ${text}`)
 *     })
 *   }
 * })
 * ```
 *
 * @example
 *
 * ```typescript
 * // WebSocket client implementation
 * const ws = await node.services.http.connect('libp2p://QmPeerID/ws', {
 *   keepAliveIntervalMs: 30000,
 *   fragmentationThreshold: 16384
 * })
 *
 * ws.addEventListener('message', event => {
 *   console.log('Received:', event.data)
 * })
 *
 * await ws.send('Hello WebSocket!')
 * ```
 *
 * @example
 *
 * ```typescript
 * // Lower-level WebSocket API example
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
