import { http } from '@libp2p/protocol-http'
import { createLibp2p } from 'libp2p'
import type { HttpRequest, HttpResponse, WebSocket } from '@libp2p/protocol-http'
import type { Libp2p } from 'libp2p'

interface ChatMessage {
  sender: string
  text: string
}

/**
 * Create a WebSocket chat server
 */
export async function createChatServer (): Promise<Libp2p> {
  const node = await createLibp2p({
    services: {
      http: http()
    }
  })

  const server = node.services.http.createServer()
  const clients = new Set<WebSocket>()

  server.on('request', async (request: HttpRequest, response: HttpResponse) => {
    const { services } = node

    // Handle WebSocket upgrades
    if (services.http.isWebSocketRequest(request)) {
      const ws = await services.http.upgradeWebSocket(request, response)
      clients.add(ws)

      // Broadcast messages to all clients
      ws.addEventListener('message', async (event: MessageEvent) => {
        const message: ChatMessage = {
          sender: `Client ${clients.size}`,
          text: event.data.toString()
        }

        // Send to all connected clients
        const messageStr = JSON.stringify(message)
        for (const client of clients) {
          await client.send(messageStr).catch(() => {
            // Ignore send errors - client will be removed on close
          })
        }
      })

      // Remove client when they disconnect
      ws.addEventListener('close', () => {
        clients.delete(ws)
      })
    } else {
      // Serve HTML client for non-WebSocket requests
      response.writeHead(200, { 'Content-Type': 'text/html' })
      response.end(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>libp2p WebSocket Chat</title>
          </head>
          <body>
            <h1>WebSocket Chat</h1>
            <div id="messages"></div>
            <input id="input" type="text">
            <button onclick="send()">Send</button>
            <script>
              const messages = document.getElementById('messages')
              const input = document.getElementById('input')
              const ws = new WebSocket('libp2p://${node.peerId.toString()}/chat')
              
              ws.onmessage = (event) => {
                const msg = JSON.parse(event.data)
                const div = document.createElement('div')
                div.textContent = msg.sender + ': ' + msg.text
                messages.appendChild(div)
              }
              
              function send() {
                ws.send(input.value)
                input.value = ''
              }
            </script>
          </body>
        </html>
      `)
    }
  })

  return node
}

/**
 * Connect to a WebSocket chat server
 */
export async function connectToChat (
  serverPeerId: string,
  onMessage: (message: ChatMessage) => void
): Promise<WebSocket> {
  const node = await createLibp2p({
    services: {
      http: http()
    }
  })

  // Connect to the chat server
  const ws = await node.services.http.connect(`libp2p://${serverPeerId}/chat`)

  // Handle incoming messages
  ws.addEventListener('message', async (event: MessageEvent) => {
    const message = JSON.parse(event.data.toString()) as ChatMessage
    onMessage(message)
  })

  return ws
}

// Example usage:
/*
// Start server
const server = await createChatServer()
const serverId = server.peerId.toString()

// Connect a client
const ws = await connectToChat(serverId, (message) => {
  // Process incoming messages
})

// Send a message
await ws.send('Hello chat!')
*/
