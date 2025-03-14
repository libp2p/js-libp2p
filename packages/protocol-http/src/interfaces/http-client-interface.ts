/**
 * HTTP client interface for libp2p
 */
import type { ProtocolDiscoveryResult } from '../http-client.js'
import type { http } from '../http-proto-api.js'
import type { AbortOptions, PeerId } from '@libp2p/interface'

/**
 * HTTP client interface
 */
export interface HttpClientInterface {
  /**
   * Sends an HTTP request to a remote peer or URL
   * 
   * @param peerOrUrl - The peer ID or URL to send the request to
   * @param request - The HTTP request to send
   * @param options - Optional abort options
   * @returns A promise that resolves to the HTTP response
   */
  fetch(peerOrUrl: PeerId | string | URL, request: http.HttpRequest, options?: AbortOptions): Promise<http.HttpResponse>

  /**
   * Discover protocols supported by a remote peer
   * Uses the .well-known/libp2p/protocols endpoint to query available protocols
   */
  discoverProtocols(peer: PeerId, options?: AbortOptions): Promise<ProtocolDiscoveryResult>
}
