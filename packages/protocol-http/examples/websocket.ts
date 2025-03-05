import { http } from '@libp2p/protocol-http'
import { createLibp2p } from 'libp2p'
import type { HttpRequest, HttpResponse } from '@libp2p/protocol-http'
import type { Libp2p } from 'libp2p'

export async function createWebSocketServer (): Promise<void> {
  const node = await createLibp2p({
    services: {
      http: http()
    }
  })

  const server = node.services.http.createServer()

  server.on('request', async (request: HttpRequest, response: HttpResponse) => {
    if (node.services.http.isWebSocketRequest(request)) {
      const ws = await node.services.http.upgradeWebSocket(request, response)

      ws.addEventListener('message', async (event: MessageEvent) => {
        const data = event.data
        await ws.send(`Echo: ${data}`)
      })

      ws.addEventListener('close', (event: CloseEvent) => {
        console.log(`WebSocket closed: ${event.code} ${event.reason}`)
      })
    }
  })
}

export async function connectWebSocket (): Promise<void> {
  const node = await createLibp2p({
    services: {
      http: http()
    }
  })

  const ws = await node.services.http.connect('libp2p://QmPeerID/ws', {
    keepAliveIntervalMs: 30000, // Send ping frames every 30 seconds
    fragmentationThreshold: 16384 // Fragment messages larger than 16KB
  })

  ws.addEventListener('message', (event: MessageEvent) => {
    console.log('Received:', event.data)
  })

  // Send both text and binary data
  await ws.send('Hello WebSocket!')
  await ws.send(new Uint8Array([1, 2, 3, 4]))

  // Proper closure when done
  await ws.close(1000, 'Normal closure')
}
