/**
 * HTTP protocol implementation for libp2p
 */
// Export core interfaces
export type { HttpServerInterface } from './interfaces/http-server-interface.js'
export type { HttpClientInterface } from './interfaces/http-client-interface.js'
export type { RequestHandler } from './interfaces/request-handler-interface.js'
export type { Middleware, NextFunction } from './interfaces/middleware-interface.js'

// Export initialization types
export type { HttpInit } from './interfaces/http-init-interface.js'

// Export client and server implementations
export { HttpClientFactory as httpClient } from './http-client-factory.js'
export type { HttpComponents } from './http-components-interface.js'
export { HttpServerFactory as httpServer } from './http-server-factory.js'

// Export utility classes
export { HeaderUtils } from './utils/header-utils.js'
export { HttpMessageUtils } from './utils/http-message-utils.js'
export { ContentUtils } from './utils/content-utils.js'
export { AddressUtils } from './utils/address-utils.js'
export { URL } from './common/url.js'

// Export WHATWG Fetch API implementations
export { FetchUtils } from './client/fetch-utils.js'
export { Request } from './client/request.js'
export { Response } from './client/response.js'
