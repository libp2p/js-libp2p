import type { HttpRequest } from './transport-types.js'

/**
 * Read the entire request body as a string
 */
export async function readRequestBody (request: HttpRequest): Promise<string> {
  // Convert request body to string if it exists
  if (request.body != null) {
    const decoder = new TextDecoder()
    return decoder.decode(request.body)
  }

  return ''
}
