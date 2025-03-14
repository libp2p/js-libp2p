/**
 * HTTP server implementation for libp2p
 */
import { pbStream } from 'it-protobuf-stream'
import { HttpConstants } from './constants.js'
import { createProtocolDiscoveryHandler } from './handlers/protocol-discovery-handler.js'
import { http } from './http-proto-api.js'
import { ProtocolRegistry } from './registry/protocol-registry.js'
import { Router } from './router.js'
import type { HttpComponents } from './http-components-interface.js'
import type { HttpInit } from './interfaces/http-init-interface.js'
import type { HttpServerInterface } from './interfaces/http-server-interface.js'
import type { Middleware } from './interfaces/middleware-interface.js'
import type { RequestHandler } from './interfaces/request-handler-interface.js'
import type { Logger, Startable, IncomingStreamData } from '@libp2p/interface'

const DEFAULT_TIMEOUT = 30000 // 30 seconds
const WELL_KNOWN_PROTOCOLS_PATH = '/.well-known/libp2p/protocols'

export class HttpServer implements Startable, HttpServerInterface {
  private readonly log: Logger
  private readonly components: HttpComponents
  private readonly protocol: string
  private readonly router: Router
  private started: boolean
  private readonly init: HttpInit
  private readonly protocolRegistry: ProtocolRegistry

  constructor (components: HttpComponents, init: HttpInit = {}) {
    this.log = components.logger.forComponent('libp2p:http:server')
    this.components = components
    this.protocol = `/${HttpConstants.PROTOCOL_NAME}/${HttpConstants.PROTOCOL_VERSION}`
    this.router = new Router(components.logger.forComponent('libp2p:http:router'))
    this.started = false
    this.init = init
    this.protocolRegistry = new ProtocolRegistry(components.logger)
    this.handleMessage = this.handleMessage.bind(this)

    // Register built-in protocols
    this.registerBuiltInProtocols()

    // Register protocol discovery handler
    this.registerProtocolDiscoveryEndpoint()
  }

  readonly [Symbol.toStringTag] = '@libp2p/http-server'

  /**
   * Register built-in protocols in the registry
   */
  private registerBuiltInProtocols (): void {
    // Register the HTTP protocol itself
    this.protocolRegistry.registerProtocol({
      id: this.protocol,
      name: 'HTTP over libp2p',
      description: 'HTTP/1.1 protocol over libp2p streams',
      version: HttpConstants.PROTOCOL_VERSION
    })
  }

  /**
   * Register the protocol discovery endpoint
   */
  private registerProtocolDiscoveryEndpoint (): void {
    const handler = createProtocolDiscoveryHandler({
      protocolRegistry: this.protocolRegistry
    })

    this.router.route(WELL_KNOWN_PROTOCOLS_PATH, handler)
    this.log.trace(`registered protocol discovery endpoint at ${WELL_KNOWN_PROTOCOLS_PATH}`)
  }

  async start (): Promise<void> {
    try {
      await this.components.registrar.handle(this.protocol, (data: IncomingStreamData) => {
        void this.handleMessage(data).catch(err => {
          this.log.error('error handling HTTP request - %e', err)
        })
      }, {
        maxInboundStreams: this.init.maxInboundStreams,
        maxOutboundStreams: this.init.maxOutboundStreams
      })
      this.log.trace('http server started')
      this.started = true
    } catch (err: any) {
      this.log.error('failed to start http server - %e', err)
      throw err
    }
  }

  async stop (): Promise<void> {
    await this.components.registrar.unhandle(this.protocol)
    this.log.trace('http server stopped')
    this.started = false
  }

  isStarted (): boolean {
    return this.started
  }

  register (path: string, handler: RequestHandler): void {
    if (!this.isStarted()) {
      // Auto-start the server if it hasn't been started
      void this.start().catch(err => {
        this.log.error('failed to auto-start http server - %e', err)
      })
    }
    this.router.route(path, handler)
  }

  use (middleware: Middleware): void {
    this.router.use(middleware)
  }

  /**
   * Register a protocol with the protocol registry
   */
  registerProtocol (protocol: {
    id: string
    name: string
    description: string
    version: string
    url?: string
  }): void {
    this.protocolRegistry.registerProtocol(protocol)
  }

  /**
   * Get all registered protocols
   */
  getProtocols (): Array<{
    id: string
    name: string
    description: string
    version: string
    url?: string
  }> {
    return this.protocolRegistry.getAllProtocols()
  }

  async handleMessage (data: IncomingStreamData): Promise<void> {
    const { stream, connection } = data
    const abortController = new AbortController()
    const signal = abortController.signal
    const timeout = setTimeout(() => {
      abortController.abort(new Error('Request timed out'))
    }, this.init.timeout ?? DEFAULT_TIMEOUT)

    try {
      this.log.trace('received stream from %p', connection.remotePeer)
      const pb = pbStream(stream)

      try {
        const request = await pb.read(http.HttpRequest, { signal })
        this.log.trace('received %s request for %s', request.method, request.targetUri)
        const response = await this.router.handle(request)
        await pb.write(response, http.HttpResponse, { signal })
        this.log.trace('sent response with status %d', response.statusCode)
      } finally {
        try {
          await pb.unwrap().close({ signal })
        } catch (err) {
          this.log.error('error closing protobuf stream - %e', err)
        }
        try {
          await stream.close()
        } catch (err) {
          this.log.error('error closing stream - %e', err)
        }
      }
    } catch (err: any) {
      this.log.error('error processing HTTP request - %e', err)
      stream.abort(err)
    } finally {
      clearTimeout(timeout)
    }
  }
}
