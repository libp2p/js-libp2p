/**
 * WHATWG Fetch API implementation over libp2p
 * Extends the standard fetch functionality to support libp2p URLs
 */
import { URL } from '../common/url.js'
import { type http } from '../http-proto-api.js'
import { AddressUtils } from '../utils/address-utils.js'
import { Request } from './request.js'
import { Response } from './response.js'
import type { HttpClient } from '../http-client.js'
import type { PeerId } from '@libp2p/interface'

/* eslint-disable @typescript-eslint/no-extraneous-class */
export class FetchUtils {
  private static readonly originalFetch = globalThis.fetch

  /**
   * Converts a WHATWG Request to an HTTP Protocol Request
   */
  private static async createHttpRequestFromWhatwg (request: Request): Promise<http.HttpRequest> {
    // Get headers
    const headers = Array.from(request.headers.entries()).map(([name, value]) => ({
      name,
      value
    }))

    // Get body content
    let content = new Uint8Array(0)
    if (request.body != null) {
      const buffer = await request.arrayBuffer()
      content = new Uint8Array(buffer)
    }

    return this.createHttpMessage(request.method, request.url, {
      protocolVersion: 'HTTP/1.1',
      baseMessage: {
        headers,
        content,
        trailers: []
      }
    })
  }

  /**
   * Local implementation of createHttpMessage to construct an HTTP request
   */
  private static createHttpMessage (method: string, url: string, options: { protocolVersion: string, baseMessage: { headers: Array<{ name: string, value: string }>, content: Uint8Array, trailers: any[] } }): http.HttpRequest {
    return {
      method,
      targetUri: url,
      protocolVersion: options.protocolVersion,
      baseMessage: {
        headers: options.baseMessage.headers,
        content: options.baseMessage.content,
        trailers: options.baseMessage.trailers
      }
    }
  }

  /**
   * Converts an HTTP Protocol Response to a WHATWG Response
   */
  private static createWhatwgResponseFromHttp (httpResponse: http.HttpResponse): Response {
    // Convert headers
    const headers = new Headers()
    for (const header of httpResponse.headers ?? []) {
      headers.append(header.name, header.value)
    }

    // Get body content
    const body = httpResponse.content ?? new Uint8Array(0)

    // Create response
    return new Response(body, {
      status: Number(httpResponse.statusCode),
      statusText: httpResponse.reasonPhrase,
      headers
    })
  }

  /**
   * List of supported URL protocols
   */
  private static readonly SUPPORTED_PROTOCOLS = ['libp2p:', 'http:', 'https:']

  /**
   * Determines if the URL should be handled by the libp2p client
   */
  private static isLibp2pUrl (parsedUrl: URL): boolean {
    // If it's explicitly a libp2p URL or the hostname looks like a PeerId
    return parsedUrl.protocol === 'libp2p:' || !parsedUrl.hostname.includes('.')
  }

  /**
   * Validates URL and extracts PeerId.
   *
   * @throws {Error} If URL is invalid or PeerId cannot be extracted
   */
  private static validateUrlAndGetPeerId (url: URL): PeerId {
    // Check for supported protocols
    if (!this.SUPPORTED_PROTOCOLS.includes(url.protocol)) {
      throw new Error(`Invalid URL: protocol '${url.protocol}' is not supported. Must be one of: ${this.SUPPORTED_PROTOCOLS.join(', ')}`)
    }

    // Extract PeerId from URL
    const peerId = AddressUtils.extractPeerId(url)
    if (peerId == null) {
      throw new Error(`Invalid URL: could not extract peer ID from ${url.href}`)
    }

    return peerId
  }

  /**
   * Handle fetch requests using libp2p
   */
  private static async fetchWithLibp2p (client: HttpClient, request: Request, parsedUrl: URL): Promise<Response> {
    // Validate URL and get PeerId
    const peerId = this.validateUrlAndGetPeerId(parsedUrl)

    // Convert Request to HTTP Protocol Request
    const httpRequest = await this.createHttpRequestFromWhatwg(request)

    // Send the request using the HTTP client
    const httpResponse = await client.fetch(peerId, httpRequest)

    // Convert HTTP Protocol Response to WHATWG Response
    return this.createWhatwgResponseFromHttp(httpResponse)
  }

  /**
   * Libp2p fetch implementation
   */
  static async libp2pFetch (client: HttpClient, input: string | URL | Request, init?: RequestInit): Promise<Response> {
    // Create a Request object
    const request = input instanceof Request ? input : new Request(String(input), init)

    // Parse the URL
    let parsedUrl: URL
    if (input instanceof Request) {
      parsedUrl = new URL(input.url)
    } else if (typeof input === 'string') {
      parsedUrl = new URL(input)
    } else {
      parsedUrl = new URL(input.toString())
    }

    // Handle with libp2p
    return this.fetchWithLibp2p(client, request, parsedUrl)
  }

  /**
   * Enhanced fetch implementation that supports both standard HTTP and libp2p
   */
  static createFetch (client: HttpClient) {
    return async function enhancedFetch (input: string | URL | Request, init?: RequestInit): Promise<Response> {
      // Parse the URL to determine if this is a libp2p URL
      let url: string
      if (input instanceof Request) {
        url = input.url
      } else if (typeof input === 'string') {
        url = input
      } else {
        url = input.toString()
      }

      const parsedUrl = new URL(url)

      // Check if this is a libp2p URL
      if (FetchUtils.isLibp2pUrl(parsedUrl)) {
        return FetchUtils.libp2pFetch(client, input, init)
      }

      // For regular URLs, delegate to the original fetch implementation
      // @ts-expect-error - Response implementations differ but are compatible enough
      return FetchUtils.originalFetch(input, init)
    }
  }

  /**
   * Patch global fetch to support libp2p
   */
  static patchGlobalFetch (client: HttpClient): () => void {
    const enhanced = this.createFetch(client)
    const original = globalThis.fetch

    // @ts-expect-error - We know this is compatible enough
    globalThis.fetch = enhanced

    // Return a function that restores the original fetch
    return () => {
      globalThis.fetch = original
    }
  }
}

// Export for compatibility with existing code
export const fetch = FetchUtils.createFetch
