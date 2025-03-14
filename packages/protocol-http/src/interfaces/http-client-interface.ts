/**
 * HTTP client interface for libp2p
 */

import type { Response } from '../client/response.js'
import type { http } from '../http-proto-api.js'
import type { PeerId, AbortOptions } from '@libp2p/interface'

/**
 * Interface for the HTTP client implementation
 */
export interface HttpClientInterface {
  /**
   * Sends an HTTP request to a peer and gets the response
   */
  fetch(peer: PeerId | URL, request: http.HttpRequest, options?: AbortOptions): Promise<http.HttpResponse>

  /**
   * WHATWG Fetch API implementation
   */
  fetch(url: string | URL, init?: RequestInit): Promise<Response>
}
