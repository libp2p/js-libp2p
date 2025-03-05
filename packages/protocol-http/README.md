# @libp2p/protocol-http

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)

> HTTP/1.1 protocol implementation for libp2p with WebSocket support (RFC 6455)

## Table of Contents

- [Overview](#overview)
- [Install](#install)
- [Usage](#usage)
  - [HTTP Server](#http-server)
  - [HTTP Client](#http-client)
  - [WebSocket Support](#websocket-support)
- [Architecture](#architecture)
  - [WebSocket Implementation](#websocket-implementation)
  - [Performance Optimizations](#performance-optimizations)
  - [Cross-Environment Compatibility](#cross-environment-compatibility)
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

### HTTP Server

```typescript
import { createLibp2p } from 'libp2p'
import { http } from '@libp2p/protocol-http'

const node = await createLibp2p({
  services: {
    http: http()
  }
})

// Create an HTTP server
const server = node.services.http.createServer()

server.on('request', (request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/plain' })
  response.end('Hello from libp2p HTTP server!')
})
```

### HTTP Client

```typescript
// Make HTTP requests to other libp2p nodes
const response = await node.services.http.fetch('libp2p://QmPeerID/path')
const data = await response.text()
```

### WebSocket Support

```typescript
// Server-side WebSocket
server.on('request', (request, response) => {
  if (WebSocket.isWebSocketRequest(request)) {
    const ws = await service.upgradeWebSocket(request, response)
    ws.addEventListener('message', async event => {
      const data = event.data
      await ws.send(`Echo: ${data}`)
    })
    
    // Handle closure
    ws.addEventListener('close', event => {
      console.log(`WebSocket closed: ${event.code} ${event.reason}`)
    })
  }
})

// Client-side WebSocket
const ws = await node.services.http.connect('libp2p://QmPeerID/ws', {
  // Optional WebSocket configuration
  keepAliveIntervalMs: 30000, // Send ping frames every 30 seconds
  fragmentationThreshold: 16384 // Fragment messages larger than 16KB
})

ws.addEventListener('message', event => {
  console.log('Received:', event.data)
})

// Can send both text and binary data
await ws.send('Hello WebSocket!')
await ws.send(new Uint8Array([1, 2, 3, 4]))

// Proper closure when done
await ws.close(1000, 'Normal closure')
```

## Architecture

### WebSocket Implementation

This package implements a complete WebSocket client according to RFC 6455, with support for:

- Standard WebSocket events (open, message, error, close)
- Text and binary message types
- Message fragmentation for large payloads
- Keep-alive with ping/pong frames
- Proper connection lifecycle management
- Graceful closure with status codes and reasons

The WebSocket implementation is structured with a modular design that separates concerns:

- `WebSocketImpl` - Core implementation of the WebSocket interface
- `WebSocketFrameHandler` - Handles creating and processing WebSocket frames
- `WebSocketStreamHandler` - Manages reading frames from the underlying stream
- `WebSocketEventHandler` - Manages event dispatching with performance optimizations
- `WebSocketConfigManager` - Centralizes configuration options
- `WebSocketSignalHandler` - Handles abort signal lifecycle and cleanup

### Performance Optimizations

Performance is optimized in several ways:

1. **Event Listener Checks**: Events are only created and dispatched when listeners exist
2. **Fragmentation Threshold**: Large messages are automatically fragmented to prevent blocking
3. **Keep-Alive Mechanism**: Optional ping/pong frames maintain connection health
4. **Code Size**: All files are kept under 200 lines to improve maintainability
5. **Modular Design**: Single-responsibility components improve testability and reuse

### Cross-Environment Compatibility

The implementation works consistently across both Node.js and browser environments:

- Environment-agnostic event classes created via factory functions
- Browser polyfills provided for Node.js testing environment
- Consistent behavior regardless of runtime environment

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
