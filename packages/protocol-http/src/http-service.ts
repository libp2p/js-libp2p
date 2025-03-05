import { type ComponentLogger } from '@libp2p/interface'
import { peerIdFromString } from '@libp2p/peer-id'
import { pbStream } from 'it-protobuf-stream'
import {
  PROTOCOL_NAME,
  PROTOCOL_VERSION,
  DEFAULT_MAX_INBOUND_STREAMS,
  DEFAULT_MAX_OUTBOUND_STREAMS,
  DEFAULT_TIMEOUT,
  WEBSOCKET_OPEN
} from './constants.js'
import { Request, Response } from './pb/http.js'
import type {
  HttpServiceInterface,
  HttpResponse,
  HttpServerOptions,
  HttpServiceInit,
  WebSocket,
  HttpServer,
  Libp2pResponse
} from './interfaces.js'
import type { ConnectionManager, Registrar } from '@libp2p/interface-internal'

/**
 * HTTP Service Components
 */
export interface HttpServiceComponents {
  logger: ComponentLogger
  registrar: Registrar
  connectionManager: ConnectionManager
}

/**
 * HTTP Service implementation for libp2p
 */
export class HttpService implements HttpServiceInterface {
  private readonly protocol: string
  private readonly components: HttpServiceComponents
  private started: boolean
  private readonly servers = new Map<string, HttpServer>()

  private readonly maxInboundStreams: number
  private readonly maxOutboundStreams: number
  private readonly requestTimeout: number
  private readonly responseTimeout: number
  private readonly runOnLimitedConnection: boolean

  constructor (components: HttpServiceComponents, init: HttpServiceInit = {}) {
    this.components = components
    this.started = false
    this.protocol = `/${PROTOCOL_NAME}/${PROTOCOL_VERSION}`

    this.maxInboundStreams = init.maxInboundStreams ?? DEFAULT_MAX_INBOUND_STREAMS
    this.maxOutboundStreams = init.maxOutboundStreams ?? DEFAULT_MAX_OUTBOUND_STREAMS
    this.requestTimeout = init.requestTimeout ?? DEFAULT_TIMEOUT
    this.responseTimeout = init.responseTimeout ?? DEFAULT_TIMEOUT
    this.runOnLimitedConnection = init.runOnLimitedConnection ?? true
  }

  [Symbol.toStringTag] = '@libp2p/http'

  /**
   * Start the HTTP service
   */
  async start (): Promise<void> {
    if (this.started) {
      return
    }

    await this.components.registrar.handle(this.protocol, () => {
      // Placeholder implementation
    }, {
      maxInboundStreams: this.maxInboundStreams,
      maxOutboundStreams: this.maxOutboundStreams,
      runOnLimitedConnection: this.runOnLimitedConnection
    })

    this.started = true
  }

  /**
   * Stop the HTTP service
   */
  async stop (): Promise<void> {
    if (!this.started) {
      return
    }

    await this.components.registrar.unhandle(this.protocol)
    this.started = false
  }

  /**
   * Check if the service is started
   */
  isStarted (): boolean {
    return this.started
  }

  // Track server count for auto-naming
  private static serverCount: number = 0

  /**
   * Create an HTTP server
   */
  createServer (options: HttpServerOptions = {}): HttpServer {
    // Increment server count for unique naming
    HttpService.serverCount = HttpService.serverCount === 0 ? 1 : HttpService.serverCount + 1

    // Generate unique server name if not provided
    const name = options.name ?? `server-${HttpService.serverCount}`

    if (this.servers.has(name)) {
      throw new Error(`Server with name '${name}' already exists`)
    }

    const server: HttpServer = {
      address: name,
      on: (event, listener) => { return server },
      handleRequest: () => {},
      stop: async () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false
    }

    this.servers.set(name, server)

    return server
  }

  /**
   * Convert headers from various formats to Map
   */
  private headersToMap (headers: HeadersInit | undefined): Map<string, string> {
    const result = new Map<string, string>()

    if (headers != null) {
      if (headers instanceof Headers) {
        headers.forEach((value, key) => {
          result.set(key, value)
        })
      } else if (Array.isArray(headers)) {
        for (const [key, value] of headers) {
          result.set(key, value)
        }
      } else {
        Object.entries(headers).forEach(([key, value]) => {
          result.set(key, value.toString())
        })
      }
    }

    return result
  }

  /**
   * Convert Map headers to Record for response
   */
  private mapToRecord (headers: Map<string, string>): Record<string, string> {
    const result: Record<string, string> = {}
    headers.forEach((value, key) => {
      result[key] = value
    })
    return result
  }

  /**
   * Make an HTTP request to a peer
   */
  async fetch (url: string | URL, init?: RequestInit): Promise<Libp2pResponse> {
    if (!this.started) {
      throw new Error('HTTP service is not started')
    }

    const urlObj = url instanceof URL ? url : new URL(url)

    // Extract peer ID from hostname (libp2p URLs use peer ID as hostname)
    const peerIdStr = urlObj.hostname
    if (peerIdStr === '') {
      throw new Error('Missing peer ID in URL hostname')
    }

    // Convert the string to a proper PeerId object
    const peerId = peerIdFromString(peerIdStr)

    // Create AbortController for timeout handling
    const controller = new AbortController()
    const signal = init?.signal ?? controller.signal

    // Setup timeout if not provided in init
    const timeoutId = setTimeout(() => {
      controller.abort(new Error(`Request timed out after ${this.requestTimeout}ms`))
    }, this.requestTimeout)

    try {
      // Open connection to peer
      const connection = await this.components.connectionManager.openConnection(peerId)

      // Create stream for HTTP communication
      const stream = await connection.newStream(this.protocol, {
        signal
      })

      // Create a protobuf stream for encoding/decoding messages
      const pb = pbStream(stream)

      // Create request message with Map headers
      const requestMsg: Request = {
        method: init?.method ?? 'GET',
        path: urlObj.pathname + urlObj.search,
        headers: this.headersToMap(init?.headers),
        body: init?.body instanceof Uint8Array
          ? init.body
          : new TextEncoder().encode(String(init?.body ?? ''))
      }

      // Send request
      await pb.write(requestMsg, Request, { signal })

      // Receive response
      const responseMsg = await pb.read(Response, { signal })

      // Create a response object that matches our Libp2pResponse interface
      const response: Libp2pResponse = {
        status: responseMsg.statusCode ?? 0,
        statusText: '',
        headers: this.mapToRecord(responseMsg.headers ?? new Map()),
        body: responseMsg.body ?? new Uint8Array(0),
        json: async () => {
          const decoder = new TextDecoder()
          const text = decoder.decode(responseMsg.body)
          return JSON.parse(text)
        },
        text: async () => {
          const decoder = new TextDecoder()
          return decoder.decode(responseMsg.body)
        },
        arrayBuffer: async () => {
          return responseMsg.body?.buffer ?? new ArrayBuffer(0)
        }
      }

      return response
    } catch (err: any) {
      // Wrap error with request details
      throw new Error(`Failed to fetch ${urlObj.toString()}: ${err.message}`)
    } finally {
      clearTimeout(timeoutId)
    }
  }

  /**
   * Check if a request is a WebSocket upgrade request
   */
  isWebSocketRequest (request: globalThis.Request): boolean {
    // Check for WebSocket upgrade headers per RFC 6455
    const upgradeHeader = request.headers.get('Upgrade')?.toLowerCase()
    const connectionHeader = request.headers.get('Connection')?.toLowerCase()
    const secWebSocketKey = request.headers.get('Sec-WebSocket-Key')
    const secWebSocketVersion = request.headers.get('Sec-WebSocket-Version')

    return (
      upgradeHeader === 'websocket' &&
      Boolean(connectionHeader?.includes('upgrade')) &&
      Boolean(secWebSocketKey) &&
      secWebSocketVersion === '13' // RFC 6455 version
    )
  }

  /**
   * Upgrade an HTTP connection to WebSocket
   */
  upgradeWebSocket (request: globalThis.Request, response: HttpResponse): WebSocket {
    if (!this.started) {
      throw new Error('HTTP service is not started')
    }

    if (!this.isWebSocketRequest(request)) {
      throw new Error('Not a valid WebSocket upgrade request')
    }

    // We need to send 101 Switching Protocols response
    const secWebSocketKey = request.headers.get('Sec-WebSocket-Key')

    if (secWebSocketKey === null || secWebSocketKey === '') {
      throw new Error('Missing Sec-WebSocket-Key header')
    }

    // Compute the Sec-WebSocket-Accept header value based on RFC 6455
    // In a real implementation, we'd use crypto to generate:
    // base64(sha1(secWebSocketKey + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'))
    const secWebSocketAccept = 'placeholder-accept-value'

    // Send the WebSocket handshake response
    response.writeHead(101, {
      Upgrade: 'websocket',
      Connection: 'Upgrade',
      'Sec-WebSocket-Accept': secWebSocketAccept
    })

    // Set up response and stream
    // In a real implementation, this would use the WebSocketImpl class
    const ws: WebSocket = {
      send: async (data: string | Uint8Array) => {
        // Implementation would use proper framing as per RFC 6455
      },
      close: async (code: number = 1000, reason: string = '') => {
        // Implementation would send close frame
      },
      readyState: WEBSOCKET_OPEN,
      url: request.url,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false
    }

    return ws
  }

  /**
   * Connect to a WebSocket server
   */
  async connect (url: string | URL): Promise<WebSocket> {
    if (!this.started) {
      throw new Error('HTTP service is not started')
    }

    // Placeholder WebSocket implementation
    return {
      send: async () => {},
      close: async () => {},
      readyState: 0,
      url: '',
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false
    }
  }
}

/**
 * Create an HTTP service
 */
function createHttpService (init: HttpServiceInit = {}): (components: HttpServiceComponents) => HttpServiceInterface {
  return (components) => new HttpService(components, init)
}

/**
 * Exported as http for backward compatibility
 */
export const http = createHttpService
