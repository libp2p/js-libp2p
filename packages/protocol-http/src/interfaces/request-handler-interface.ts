/**
 * Request handler interface for HTTP protocol
 */

import type { http } from '../http-proto-api.js'

/**
 * HTTP request handler function type
 */
export interface RequestHandler {
  (request: http.HttpRequest): Promise<http.HttpResponse>
}
