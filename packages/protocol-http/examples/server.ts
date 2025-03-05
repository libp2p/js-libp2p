import { http } from '@libp2p/protocol-http'
import { createLibp2p } from 'libp2p'
import type { HttpRequest, HttpResponse } from '@libp2p/protocol-http'
import type { Libp2p } from 'libp2p'

/**
 * Create a simple HTTP server that serves an HTML page
 */
export async function startServer (): Promise<Libp2p> {
  const node = await createLibp2p({
    services: {
      http: http()
    }
  })

  const server = node.services.http.createServer()

  server.on('request', (request: HttpRequest, response: HttpResponse) => {
    // Serve HTML for the root path
    if (request.url === '/') {
      response.writeHead(200, { 'Content-Type': 'text/html' })
      response.end(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>libp2p HTTP Server</title>
          </head>
          <body>
            <h1>Welcome to libp2p HTTP</h1>
            <p>This page is served over a libp2p connection.</p>
            <p>Server PeerID: ${node.peerId.toString()}</p>
            <p>Connected Peers: ${node.getConnections().length}</p>
          </body>
        </html>
      `)
      return
    }

    // Not found for other paths
    response.writeHead(404, { 'Content-Type': 'text/plain' })
    response.end('Not Found')
  })

  return node
}
