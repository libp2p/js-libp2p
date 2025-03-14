/**
 * HTTP server interface for libp2p
 */

import type { Middleware } from './middleware-interface'
import type { RequestHandler } from './request-handler-interface'

/**
 * Interface for the HTTP server implementation
 */
export interface HttpServerInterface {
  /**
   * Register a request handler for a specific path
   */
  register(path: string, handler: RequestHandler): void

  /**
   * Add middleware to the request processing pipeline
   */
  use(middleware: Middleware): void
}
