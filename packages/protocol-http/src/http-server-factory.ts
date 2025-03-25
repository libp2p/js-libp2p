import { HttpServer } from './http-server.js'
import type { HttpComponents } from './http-components-interface.js'
import type { HttpInit } from './interfaces/http-init-interface.js'
import type { HttpServerInterface } from './interfaces/http-server-interface.js'

export class HttpServerFactory {
  static createServer (init: HttpInit = {}): (components: HttpComponents) => HttpServerInterface {
    return (components) => new HttpServer(components, init)
  }
}
