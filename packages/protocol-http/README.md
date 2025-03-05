# @libp2p/protocol-http

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p/main.yml?branch=main\&style=flat-square)](https://github.com/libp2p/js-libp2p/actions/workflows/main.yml?query=branch%3Amain)

> HTTP/1.1 protocol implementation for libp2p with WebSocket support (RFC 6455)

# About

<!--

!IMPORTANT!

Everything in this README between "# About" and "# Install" is automatically
generated and will be overwritten the next time the doc generator is run.

To make changes to this section, please update the @packageDocumentation section
of src/index.js or src/index.ts

To experiment with formatting, please run "npm run docs" from the root of this
repo and examine the changes made.

-->

An implementation of the HTTP/1.1 protocol for libp2p. It allows you to:
- Create HTTP servers that handle requests over libp2p connections
- Make HTTP requests to other libp2p nodes
- Use WebSocket connections over libp2p streams with full RFC 6455 compliance

## Example

```typescript
import { createLibp2p } from 'libp2p'
import { http } from '@libp2p/http'

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

```typescript
// Make HTTP requests to other libp2p nodes
const response = await node.services.http.fetch('libp2p://QmPeerID/resource')
const text = await response.text()
console.log('Response:', text)
```

```typescript
// WebSocket server implementation
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

```typescript
// WebSocket client implementation
const ws = await node.services.http.connect('libp2p://QmPeerID/ws', {
  keepAliveIntervalMs: 30000,
  fragmentationThreshold: 16384
})

ws.addEventListener('message', event => {
  console.log('Received:', event.data)
})

await ws.send('Hello WebSocket!')
```

```typescript
// Lower-level WebSocket API example
import { createLibp2p } from 'libp2p'
import { webSocketHttp } from '@libp2p/http'

// Use the WebSocket implementation
const ws = webSocketHttp(stream, abortSignal, logger)

// Send a message
await ws.send('Hello world')

// Close the connection
await ws.close()
```

# Install

```console
npm install @libp2p/protocol-http
```

## Browser `<script>` tag

Loading this module through a script tag will make its exports available as `Libp2pHttp` in the global namespace.

```html
<script src="https://unpkg.com/@libp2p/http/dist/index.min.js"></script>
```

# API Docs

- <https://libp2p.github.io/js-libp2p/modules/_libp2p_http.html>

# Additional Resources

A complete example demonstrating a RESTful API server with CRUD operations is available in the [examples/api](./examples/api) directory. It includes:

- Status endpoint returning node information
- Notes API with full CRUD operations
- Memory-based storage that works in both Node.js and browser
- TypeScript interfaces and error handling
- Client implementation with clean API

# License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](https://github.com/libp2p/js-libp2p/blob/main/packages/protocol-http/LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](https://github.com/libp2p/js-libp2p/blob/main/packages/protocol-http/LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

# Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
