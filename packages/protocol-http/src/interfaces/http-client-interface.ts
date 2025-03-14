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
   * Sends an HTTP request to a remote peer
   */
  fetch(peer: PeerId, request: http.HttpRequest, options?: AbortOptions): Promise<http.HttpResponse>

  /**
   * Discover protocols supported by a remote peer
   * Uses the .well-known/libp2p/protocols endpoint to query available protocols
   */
  discoverProtocols(peer: PeerId, options?: AbortOptions): Promise<ProtocolDiscoveryResult>
}
