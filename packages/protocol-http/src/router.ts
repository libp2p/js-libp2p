/**
 * HTTP request router implementation
 */

import { URL } from './common/url.js'
import { HttpMessageUtils } from './utils/http-message-utils.js'
import type { http } from './http-proto-api.js'
import type { Middleware } from './interfaces/middleware-interface.js'
import type { RequestHandler } from './interfaces/request-handler-interface.js'
import type { Logger } from '@libp2p/interface'

/**
 * Path router for handling HTTP requests
 */
export class Router {
  private readonly log: Logger
  private readonly routes: Map<string, RequestHandler>
  private readonly middlewares: Middleware[]

  constructor (log: Logger) {
    this.log = log
    this.routes = new Map()
    this.middlewares = []
  }

  /**
   * Register a handler for a specific path
   */
  route (path: string, handler: RequestHandler): void {
    this.log.trace('registering handler for path: %s', path)
    this.routes.set(path, handler)
  }

  /**
   * Add middleware to the request processing pipeline
   */
  use (middleware: Middleware): void {
    this.log.trace('adding middleware')
    this.middlewares.push(middleware)
  }

  /**
   * Find the best matching handler for a path
   */
  private findHandler (path: string): RequestHandler | undefined {
    this.log.trace('looking for handler for path: %s', path)

    // First try exact match
    if (this.routes.has(path)) {
      return this.routes.get(path)
    }

    // Look for prefix matches
    let bestMatch: string | undefined
    let bestLength = 0

    for (const routePath of this.routes.keys()) {
      // Check if this route is a prefix of the requested path
      if (path.startsWith(routePath) &&
         (path.length === routePath.length || path[routePath.length] === '/')) {
        // Found a prefix match, check if it's better than current best
        if (routePath.length > bestLength) {
          bestMatch = routePath
          bestLength = routePath.length
        }
      }
    }

    return bestMatch !== undefined ? this.routes.get(bestMatch) : undefined
  }

  /**
   * Handle a request by routing it to the appropriate handler
   */
  async handle (request: http.HttpRequest): Promise<http.HttpResponse> {
    try {
      // Extract path from target URI
      let path = request.targetUri

      // Parse the URI to get the path
      try {
        const url = new URL(request.targetUri)
        path = url.pathname
      } catch {
        // If parsing fails, use the targetUri as is
        this.log.trace('failed to parse URI, using as-is: %s', request.targetUri)
      }

      this.log.trace('handling request for path: %s', path)

      // Find handler for the requested path
      const handler = this.findHandler(path)

      if (handler == null) {
        this.log.trace('no handler found for path: %s', path)
        return HttpMessageUtils.createResponse(404, {
          reasonPhrase: 'Not Found',
          protocolVersion: request.protocolVersion
        })
      }

      // Apply middlewares in order
      if (this.middlewares.length > 0) {
        let index = 0

        const next = async (): Promise<http.HttpResponse> => {
          if (index >= this.middlewares.length) {
            // All middlewares applied, call handler directly
            return handler(request)
          }

          const middleware = this.middlewares[index++]
          // Execute middleware
          return middleware(request, next)
        }

        // Start the middleware chain
        return await next()
      }

      // No middlewares, call handler directly
      return await handler(request)
    } catch (err: any) {
      // Log the error
      this.log.error('error handling request - %e', err)

      // Return 500 Internal Server Error
      return HttpMessageUtils.createResponse(500, {
        reasonPhrase: 'Internal Server Error',
        protocolVersion: request.protocolVersion !== '' ? request.protocolVersion : 'HTTP/1.1'
      })
    }
  }
}
