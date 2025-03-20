/**
 * Protocol discovery handler for .well-known/libp2p/protocols
 * Implements the protocol discovery mechanism as described in the libp2p HTTP specification
 */
import { HttpMessageUtils } from '../utils/http-message-utils.js'
import type { http } from '../http-proto-api.js'
import type { RequestHandler } from '../interfaces/request-handler-interface.js'
import type { ProtocolRegistry } from '../registry/protocol-registry.js'

/**
 * Protocol discovery handler options
 */
export interface ProtocolDiscoveryHandlerOptions {
  /** Protocol registry instance */
  protocolRegistry: ProtocolRegistry
}

/**
 * Creates a request handler for the .well-known/libp2p/protocols resource
 * This handler exposes information about supported protocols in JSON format
 */
export function createProtocolDiscoveryHandler (options: ProtocolDiscoveryHandlerOptions): RequestHandler {
  const { protocolRegistry } = options

  return async (request: http.HttpRequest): Promise<http.HttpResponse> => {
    // Get all registered protocols
    const protocols = protocolRegistry.getAllProtocols()

    // Format in JSON
    const responseBody = JSON.stringify({
      protocols: protocols.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        version: p.version,
        url: p.url
      }))
    }, null, 2)

    // Convert to UTF-8 encoded Uint8Array
    const content = new TextEncoder().encode(responseBody)

    // Create and return response with appropriate headers
    return HttpMessageUtils.createResponse(200, {
      reasonPhrase: 'OK',
      protocolVersion: request.protocolVersion,
      baseMessage: {
        headers: [
          { name: 'Content-Type', value: 'application/json' },
          { name: 'Content-Length', value: String(content.byteLength) }
        ],
        content,
        trailers: []
      }
    })
  }
}
