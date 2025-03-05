import { http } from '@libp2p/protocol-http'
import { createLibp2p } from 'libp2p'
import type { HttpService, HttpRequest, HttpResponse } from '@libp2p/protocol-http'
import type { Libp2p } from 'libp2p'

async function startServer (): Promise<void> {
  const node = await createLibp2p({
    services: {
      http: http()
    }
  })

  // Create an HTTP server
  const server = node.services.http.createServer()

  server.on('request', (request: HttpRequest, response: HttpResponse) => {
    response.writeHead(200, { 'Content-Type': 'text/plain' })
    response.end('Hello from libp2p HTTP server!')
  })
}

export { startServer }
