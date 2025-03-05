import type { HttpServiceInterface, Libp2pRequest, HttpResponse, HttpServer } from '@libp2p/protocol-http'

export interface ErrorResponse {
  error: string
  code: string
  statusCode: number
}

export {
  type HttpServiceInterface as HttpService,
  type Libp2pRequest as HttpRequest,
  type HttpResponse,
  type HttpServer
}