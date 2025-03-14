# @libp2p/http

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p/main.yml?branch=master\&style=flat-square)](https://github.com/libp2p/js-libp2p/actions/workflows/main.yml?query=branch%3Amaster)

> HTTP protocol implementation for libp2p

## Description

This package implements the HTTP protocol over libp2p as specified in the [HTTP libp2p specification](https://github.com/libp2p/specs/blob/master/http/README.md). It provides a client and server implementation allowing peers to exchange HTTP messages over libp2p streams.

The implementation includes:
- HTTP client and server with support for HTTP/1.1 semantics
- WHATWG Fetch API compatibility layer for familiar web usage
- Request routing based on URI paths
- Middleware support for request processing
- Protobuf-based message encoding/decoding

## Specification Compliance

The implementation aims to adhere to the [official libp2p HTTP specification](https://github.com/libp2p/specs/blob/master/http/README.md) with the following adaptations:

1. **Transport Layer**: Uses libp2p streams as the transport medium with Protocol Buffers for message serialization
2. **Protocol Identification**: Uses `/https/1.1` protocol identifier for stream negotiation
3. **Message Format**: Implements HTTP semantics using Protocol Buffers v3, which required adapting certain structures due to protobuf limitations

## Example Usage

### HTTP Server

```typescript
import { createLibp2p } from 'libp2p'
import { httpServer } from '@libp2p/http'

// Create a libp2p node with the HTTP server service
const libp2p = await createLibp2p({
  services: {
    http: httpServer()
  }
})

// Register a handler for the root path
libp2p.services.http.register('/', async (request) => {
  return {
    statusCode: 200,
    reasonPhrase: 'OK',
    protocolVersion: request.protocolVersion,
    headers: [
      { name: 'Content-Type', value: 'text/plain' }
    ],
    content: new TextEncoder().encode('Hello, World!')
  }
})

// Register a JSON API handler
libp2p.services.http.register('/api/users', async (request) => {
  const users = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' }
  ]
  
  return {
    statusCode: 200,
    reasonPhrase: 'OK',
    protocolVersion: request.protocolVersion,
    headers: [
      { name: 'Content-Type', value: 'application/json' }
    ],
    content: new TextEncoder().encode(JSON.stringify(users))
  }
})

// Start the libp2p node
await libp2p.start()
console.log('HTTP server running on', libp2p.peerId.toString())
```

### HTTP Client (WHATWG Fetch API)

```typescript
import { createLibp2p } from 'libp2p'
import { httpClient } from '@libp2p/http'
import { peerIdFromString } from '@libp2p/peer-id'

// Create a libp2p node with the HTTP client service
const libp2p = await createLibp2p({
  services: {
    http: httpClient()
  }
})

// Get a reference to a peer using its ID
const peerId = peerIdFromString('12D3KooWHK9BjDQBUqnavciRPhAYFvqKBe4ZiPPvde7vDaqgn5er')

// Use the WHATWG Fetch API to request a resource from the peer
const response = await libp2p.services.http.fetch(`https://${peerId.toString()}/api/users`, {
  method: 'GET',
  headers: {
    'Accept': 'application/json'
  }
})

if (response.ok) {
  const data = await response.json()
  console.log('Received users:', data)
} else {
  console.error('Error:', response.status, response.statusText)
}
```

### Low-level HTTP Client 

```typescript
import { createLibp2p } from 'libp2p'
import { httpClient } from '@libp2p/http'
import { peerIdFromString } from '@libp2p/peer-id'
import { createHttpRequest } from '@libp2p/http'
import { fromString as uint8arrayFromString } from 'uint8arrays/from-string'
import { toString as uint8arrayToString } from 'uint8arrays/to-string'

// Create a libp2p node with the HTTP client service
const libp2p = await createLibp2p({
  services: {
    http: httpClient()
  }
})

// Get a reference to a peer using its ID
const peerId = peerIdFromString('12D3KooWHK9BjDQBUqnavciRPhAYFvqKBe4ZiPPvde7vDaqgn5er')

// Create an HTTP request
const request = createHttpRequest('POST', '/api/data', {
  headers: [
    { name: 'Content-Type', value: 'application/json' }
  ],
  content: uint8arrayFromString(JSON.stringify({ key: 'value' }))
})

// Send the request using the HTTP client
const response = await libp2p.services.http.fetch(peerId, request)

// Process the response
console.log('Status:', response.statusCode, response.reasonPhrase)

// Get the content type
const contentTypeHeader = response.baseMessage?.headers.find(h => 
  h.name.toLowerCase() === 'content-type'
)
console.log('Content-Type:', contentTypeHeader?.value)

// Get the content
const content = response.baseMessage?.content
if (content) {
  if (contentTypeHeader?.value.includes('application/json')) {
    const jsonData = JSON.parse(uint8arrayToString(content))
    console.log('JSON Data:', jsonData)
  } else {
    console.log('Content:', uint8arrayToString(content))
  }
}
```

## API

### `httpClient(init?: HttpInit): (components: HttpComponents) => HttpClientInterface`

Creates an HTTP client service for libp2p.

Options:
- `timeout`: Default timeout in milliseconds (default: 30000)
- `maxInboundStreams`: Maximum number of inbound streams to allow
- `maxOutboundStreams`: Maximum number of outbound streams to allow

### `httpServer(init?: HttpInit): (components: HttpComponents) => HttpServerInterface`

Creates an HTTP server service for libp2p.

Options:
- `timeout`: Default timeout in milliseconds (default: 30000)
- `maxInboundStreams`: Maximum number of inbound streams to allow
- `maxOutboundStreams`: Maximum number of outbound streams to allow

## License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

## Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
