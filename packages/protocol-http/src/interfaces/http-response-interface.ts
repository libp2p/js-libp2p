/**
 * HTTP response interface
 */
export interface HttpResponse {
  statusCode: number
  reasonPhrase: string
  protocolVersion: string
  headers?: Array<{ name: string, value: string }>
  body?: Uint8Array
}
