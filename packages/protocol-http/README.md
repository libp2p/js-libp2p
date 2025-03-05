# @libp2p/protocol-http

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)

> HTTP/1.1 protocol implementation for libp2p with WebSocket support (RFC 6455)

## Table of Contents

- [Overview](#overview)
- [Install](#install)
- [Usage](#usage)
  - [Basic HTTP Server](#basic-http-server)
  - [Making HTTP Requests](#making-http-requests)
  - [WebSocket Support](#websocket-support)
  - [Complete RESTful API Example](#complete-restful-api-example)
- [API](#api)
- [License](#license)

## Overview

This package provides an implementation of the HTTP/1.1 protocol for libp2p. It allows you to:
- Create HTTP servers that handle requests over libp2p connections
- Make HTTP requests to other libp2p nodes
- Use WebSocket connections over libp2p streams with full RFC 6455 compliance

## Install

```bash
npm install @libp2p/protocol-http
```

## Usage

### Basic HTTP Server

Here's a simple HTTP server that responds with "Hello World":

```typescript
import { createLibp2p } from 'libp2p'
import { http } from '@libp2p/protocol-http'

const node = await createLibp2p({
  services: {
    http: http()
  }
})

const server = node.services.http.createServer()

server.on('request', (request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/plain' })
  response.end('Hello from libp2p HTTP server!')
})
```

### Making HTTP Requests

To make HTTP requests to other libp2p nodes:

```typescript
// Make HTTP requests to other libp2p nodes
const response = await node.services.http.fetch('libp2p://QmPeerID/resource')
const text = await response.text()
console.log('Response:', text)
```

### WebSocket Support

Create a WebSocket server:

```typescript
server.on('request', async (request, response) => {
  if (node.services.http.isWebSocketRequest(request)) {
    const ws = await node.services.http.upgradeWebSocket(request, response)
    
    ws.addEventListener('message', async event => {
      const text = event.data.toString()
      await ws.send(`Echo: ${text}`)
    })
  }
})
```

Connect to a WebSocket server:

```typescript
const ws = await node.services.http.connect('libp2p://QmPeerID/ws', {
  keepAliveIntervalMs: 30000,
  fragmentationThreshold: 16384
})

ws.addEventListener('message', event => {
  console.log('Received:', event.data)
})

await ws.send('Hello WebSocket!')
```

### Complete RESTful API Example

A complete example demonstrating a RESTful API server with CRUD operations is available in the [examples/api](./examples/api) directory. It includes:

- Status endpoint returning node information
- Notes API with full CRUD operations
- Memory-based storage that works in both Node.js and browser
- TypeScript interfaces and error handling
- Client implementation with clean API

For example, using the Notes API:

```typescript
import { NotesClient } from './examples/api/client'

// Create a client
const notes = new NotesClient(node, serverPeerId)

// Create a note
const note = await notes.createNote({
  title: 'Hello libp2p',
  content: 'This is a test note'
})

// Update the note
await notes.updateNote(note.id, {
  content: 'Updated content'
})

// List all notes
const allNotes = await notes.listNotes()
console.log('Notes:', allNotes)
```

See the [examples/api](./examples/api) directory for the complete implementation.

## API

### `http([options])`

Creates a new HTTP service instance for libp2p.

Options:
- `maxInboundStreams`: Maximum number of inbound streams (default: 100)
- `maxOutboundStreams`: Maximum number of outbound streams (default: 100)
- `requestTimeout`: Request timeout in milliseconds (default: 60000)
- `responseTimeout`: Response timeout in milliseconds (default: 60000)

### `HttpService`

The HTTP service interface exposed via `node.services.http`.

Methods:
- `fetch(url: string | URL, init?: RequestInit): Promise<Response>` - Make HTTP requests to other libp2p nodes
- `createServer(options?: HttpServerOptions): HttpServer` - Create an HTTP server that handles requests
- `upgradeWebSocket(request: Request, response: Response): Promise<WebSocket>` - Upgrade an HTTP connection to WebSocket
- `connect(url: string | URL, options?: WebSocketOptions): Promise<WebSocket>` - Create a WebSocket connection to another peer

### `WebSocket`

Implements the standard WebSocket interface with the following:

- `readyState` - Current connection state (CONNECTING, OPEN, CLOSING, CLOSED)
- `url` - The URL of the WebSocket connection
- `send(data: string | Uint8Array): Promise<void>` - Send data over the WebSocket
- `close(code?: number, reason?: string): Promise<void>` - Close the WebSocket connection
- Standard event listeners: 'open', 'message', 'error', 'close'

### `WebSocketOptions`

Configuration options for WebSocket connections:

- `keepAliveIntervalMs`: Interval for sending ping frames (default: 0, disabled)
- `pingTimeoutMs`: Timeout for pong response (default: 10000)
- `fragmentationThreshold`: Size threshold for message fragmentation (default: 16384)

See the TypeScript types in the source code for detailed API documentation.

## License

Licensed under either of
- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)
