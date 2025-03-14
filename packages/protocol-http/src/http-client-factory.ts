import { FetchUtils } from './client/fetch-utils.js'
import { HttpClient } from './http-client.js'
import type { HttpComponents } from './http-components-interface.js'
import type { http } from './http-proto-api.js'
import type { HttpClientInterface } from './interfaces/http-client-interface.js'
import type { HttpInit } from './interfaces/http-init-interface.js'
import type { PeerId, AbortOptions } from '@libp2p/interface'

export class HttpClientFactory {
  static createClient (init: HttpInit = {}): (components: HttpComponents) => HttpClientInterface {
    return (components) => {
      const client = new HttpClient(components, init)
      const wrappedFetch = async function (
        input: URL | RequestInfo | PeerId,
        initOrRequest?: RequestInit | http.HttpRequest,
        options?: AbortOptions
      ): Promise<Response | http.HttpResponse> {
        if (typeof input !== 'string' && !(input instanceof URL) && !(input instanceof Request)) {
          return client.fetch(input, initOrRequest as http.HttpRequest, options)
        }
        const response = await FetchUtils.libp2pFetch(client, String(input), initOrRequest as RequestInit)
        const enhancedResponse = response as any
        if (enhancedResponse.bytes == null) {
          enhancedResponse.bytes = async () => {
            const buffer = await response.arrayBuffer()
            return new Uint8Array(buffer)
          }
        }
        return enhancedResponse
      }

      const clientInterface: HttpClientInterface = {
        // @ts-expect-error - This is a valid overloaded function
        fetch: wrappedFetch
      }
      return clientInterface
    }
  }
}
