/**
 * Middleware interface for HTTP protocol
 */

import type { http } from '../http-proto-api.js'

/**
 * Next middleware function type
 */
export interface NextFunction {
  (): Promise<http.HttpResponse>
}

/**
 * HTTP middleware function type
 */
export interface Middleware {
  (request: http.HttpRequest, next: NextFunction): Promise<http.HttpResponse>
}
