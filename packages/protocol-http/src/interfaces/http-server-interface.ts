/**
 * HTTP server interface for libp2p
 */
import type { Middleware } from './middleware-interface.js'
import type { RequestHandler } from './request-handler-interface.js'

/**
 * HTTP server interface
 */
export interface HttpServerInterface {
  /**
   * Register a handler for the given path
   */
  register(path: string, handler: RequestHandler): void

  /**
   * Add middleware to the request pipeline
   */
  use(middleware: Middleware): void

  /**
   * Register a protocol with the protocol registry
   */
  registerProtocol(protocol: {
    id: string
    name: string
    description: string
    version: string
    url?: string
  }): void

  /**
   * Get all registered protocols
   */
  getProtocols(): Array<{
    id: string
    name: string
    description: string
    version: string
    url?: string
  }>
}
