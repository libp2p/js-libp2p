import type { AbortOptions, ComponentLogger, PeerId, Startable } from '@libp2p/interface'
import type { ConnectionManager, Registrar } from '@libp2p/interface-internal'
import type { Multiaddr } from '@multiformats/multiaddr'

/**
 * Libp2p HTTP Request representation
 */
export interface Libp2pRequest {
  /**
   * HTTP method
   */
  method: string
  
  /**
   * URL or path being requested
   */
  url: string
  
  /**
   * Request headers
   */
  headers: Record<string, string>
  
  /**
   * Request body if present
   */
  body?: Uint8Array
}

/**
 * Libp2p HTTP Response representation
 */
export interface Libp2pResponse {
  /**
   * HTTP status code
   */
  status: number
  
  /**
   * Status text
   */
  statusText: string
  
  /**
   * Response headers
   */
  headers: Record<string, string>
  
  /**
   * Response body
   */
  body: Uint8Array
  
  /**
   * Parse response as JSON
   */
  json(): Promise<any>
  
  /**
   * Get response as text
   */
  text(): Promise<string>
  
  /**
   * Get response as ArrayBuffer
   */
  arrayBuffer(): Promise<ArrayBuffer>
}

/**
 * HTTP Server Interface
 */
export interface HttpServer extends EventTarget {
  /**
   * Handle incoming HTTP requests
   */
  on(event: 'request', listener: (request: Libp2pRequest, response: HttpResponse) => void): this
  
  /**
   * Server address
   */
  readonly address: string
  
  /**
   * Handle incoming HTTP requests internally
   */
  handleRequest(request: Libp2pRequest, response: HttpResponse, webSocket?: WebSocket): void
  
  /**
   * Stop the server
   */
  stop(): Promise<void>
}

/**
 * HTTP Response Interface
 */
export interface HttpResponse {
  /**
   * Set response status code and headers
   */
  writeHead(statusCode: number, headers?: Record<string, string>): void
  
  /**
   * Send response body and end the response
   */
  end(body?: string | Uint8Array): void
  
  /**
   * Write chunk of data to the response
   */
  write(chunk: string | Uint8Array): void
  
  /**
   * Response headers
   */
  headers: Record<string, string>
  
  /**
   * Response status code
   */
  statusCode: number
}

/**
 * WebSocket Interface
 */
export interface WebSocket extends EventTarget {
  /**
   * Send data over the WebSocket
   */
  send(data: string | Uint8Array): Promise<void>
  
  /**
   * Close the WebSocket connection
   */
  close(code?: number, reason?: string): Promise<void>
  
  /**
   * Connection state
   */
  readonly readyState: number
  
  /**
   * Connection URL
   */
  readonly url: string
}

/**
 * HTTP Service Interface
 */
export interface HttpService extends Startable {
  /**
   * Make an HTTP request to a libp2p peer
   */
  fetch(url: string | URL, init?: RequestInit): Promise<Libp2pResponse>
  
  /**
   * Create an HTTP server that listens for requests over libp2p
   */
  createServer(options?: HttpServerOptions): HttpServer
  
  /**
   * Check if a request is a WebSocket upgrade request
   */
  isWebSocketRequest(request: globalThis.Request): boolean
  
  /**
   * Upgrade an HTTP connection to WebSocket
   */
  upgradeWebSocket(request: globalThis.Request, response: HttpResponse): WebSocket
  
  /**
   * Connect to a WebSocket server over libp2p
   * @param url The WebSocket URL to connect to
   * @param options Configuration options for the WebSocket connection
   */
  connect(url: string | URL, options?: WebSocketOptions): Promise<WebSocket>
}

/**
 * WebSocket configuration options
 */
export interface WebSocketOptions {
  /**
   * Interval in milliseconds to send ping frames for keep-alive
   * Set to 0 to disable keep-alive (default: 0)
   */
  keepAliveIntervalMs?: number
  
  /**
   * Timeout in milliseconds to wait for a pong response to a ping
   * (default: 10000, 10 seconds)
   */
  pingTimeoutMs?: number
  
  /**
   * Size threshold in bytes for message fragmentation
   * Messages larger than this will be split into multiple frames
   * (default: 16384, 16KB)
   */
  fragmentationThreshold?: number
}

/**
 * HTTP Service initialization options
 */
export interface HttpServiceInit {
  /**
   * Protocol prefix, defaults to 'libp2p'
   */
  protocolPrefix?: string
  
  /**
   * Maximum number of inbound streams, defaults to 100
   */
  maxInboundStreams?: number
  
  /**
   * Maximum number of outbound streams, defaults to 100
   */
  maxOutboundStreams?: number
  
  /**
   * Request timeout in milliseconds, defaults to 60000 (1 minute)
   */
  requestTimeout?: number
  
  /**
   * Response timeout in milliseconds, defaults to 60000 (1 minute)
   */
  responseTimeout?: number
  
  /**
   * Run on limited connections, defaults to true
   */
  runOnLimitedConnection?: boolean
}

/**
 * HTTP Server options
 */
export interface HttpServerOptions {
  /**
   * Server name
   */
  name?: string
}

/**
 * Components needed by the HTTP service
 */
export interface HttpServiceComponents {
  /**
   * Protocol handler registrar
   */
  registrar: Registrar
  
  /**
   * Connection manager for opening connections to peers
   */
  connectionManager: ConnectionManager
  
  /**
   * Logger component
   */
  logger: ComponentLogger
}
