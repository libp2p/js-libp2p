# HTTP Protocol Implementation Design

## Overview

This document outlines the design and implementation of the HTTP protocol over libp2p based on the [official libp2p HTTP specification](https://github.com/libp2p/specs/blob/master/http/README.md). It describes the current implementation architecture, design decisions, and deviations from the specification due to technical constraints.

## Specification Compliance

The implementation follows the libp2p HTTP specification with some adaptations:

1. **Transport Layer**: Uses libp2p streams as the underlying transport mechanism
2. **Protocol Identification**: Uses `/https/1.1` as the protocol identifier for stream negotiation
3. **Message Format**: Implements HTTP semantics using Protocol Buffers v3, which required several structural adaptations

## Architecture

### Core Components

The implementation consists of three main components:

1. **HTTP Client** (`HttpClient`): Sends HTTP requests to remote peers
2. **HTTP Server** (`HttpServer`): Receives and processes HTTP requests from peers
3. **Common HTTP Layer**: Shared message types, encoders/decoders, and utility functions

### Protocol Identifier

```typescript
// From constants.ts
export const PROTOCOL_VERSION = '1.1'
export const PROTOCOL_NAME = 'https'
```

The full protocol identifier used for libp2p stream negotiation is `/https/1.1`.

### Message Structure

Due to Protocol Buffers v3 limitations (particularly the lack of inheritance), the implementation uses a composition pattern for HTTP messages:

```typescript
// Base message with common fields
interface HttpMessage {
  headers: Field[];
  content: Uint8Array;
  trailers: Field[];
}

// Request as composition rather than inheritance
interface HttpRequest {
  baseMessage?: HttpMessage;  // Composition instead of inheritance
  method: string;
  targetUri: string;
  protocolVersion: string;
}

// Response as composition rather than inheritance
interface HttpResponse {
  baseMessage?: HttpMessage;  // Composition instead of inheritance
  statusCode: number;
  reasonPhrase: string;
  protocolVersion: string;
}
```

### Deviation: Protocol Buffers v3 Adaptations

Several adaptations were made to accommodate Protocol Buffers v3 constraints:

1. **Composition over Inheritance**: Used composition pattern where HttpRequest and HttpResponse contain a baseMessage reference
2. **Repeated Fields for Maps**: Used repeated field structures instead of map types
3. **OneOf for Alternatives**: Used Protocol Buffers' `oneof` for mutually exclusive fields
4. **Default Values**: All fields have default values as required by Protocol Buffers v3
5. **Explicit Message Types**: Created dedicated message types for structured data

### HTTP Client Implementation

The HTTP client implements:

1. **Core Fetch Method**: Sends HTTP requests to remote peers and returns HTTP responses
2. **WHATWG Fetch API**: Provides a web-compatible fetch interface for ease of use
3. **Connection Management**: Properly handles libp2p connections and streams
4. **Error Handling**: Robust error handling and logging

```typescript
class HttpClient implements Startable {
  // Core method to send HTTP request to a peer
  async fetch(peer: PeerId, request: http.HttpRequest, options: AbortOptions = {}): Promise<http.HttpResponse> {
    // Open connection to peer
    // Create stream using protocol identifier
    // Send request using Protocol Buffers
    // Receive and return response
  }
}
```

### HTTP Server Implementation

The HTTP server implements:

1. **Request Handling**: Processes incoming HTTP requests over libp2p streams
2. **Path-based Routing**: Routes requests to appropriate handlers based on URI path
3. **Middleware Support**: Allows processing pipelines with middleware functions
4. **Error Handling**: Proper error responses and logging

```typescript
class HttpServer implements Startable {
  // Register a handler for a specific path
  register(path: string, handler: RequestHandler): void {
    this.router.route(path, handler);
  }

  // Add middleware to request processing pipeline
  use(middleware: Middleware): void {
    this.router.use(middleware);
  }

  // Handle incoming message
  async handleMessage(data: IncomingStreamData): Promise<void> {
    // Read request using Protocol Buffers
    // Route request to appropriate handler
    // Send response using Protocol Buffers
  }
}
```

### WHATWG Fetch API Compatibility

The implementation provides a compatibility layer for the WHATWG Fetch API:

```typescript
// WHATWG Fetch API over libp2p
async function fetch(url: string | URL, init?: RequestInit): Promise<Response> {
  // Parse URL to extract peer ID and path
  // Convert to HTTP request format
  // Send request using HTTP client
  // Convert HTTP response to WHATWG Response
}
```

## Key Deviations from Specification

### 1. Namespace Implementation

The specification calls for using a `.well-known/libp2p/protocols` resource for discovering application protocols. The current implementation uses direct path-based routing without this discovery mechanism. This is a known deviation from the specification.

```typescript
// Current implementation uses direct path registration
libp2p.services.http.register('/api/users', handler);

// Specification suggests protocol discovery via
// GET /.well-known/libp2p/protocols
```

### 2. Authentication

The specification mentions that Peer ID authentication is optional, with specific authentication schemes to be defined in a future spec. The current implementation does not include explicit peer authentication beyond what libp2p provides at the transport layer.

### 3. HTTP Encoding

The specification allows for different encodings of HTTP semantics (HTTP/1.1, HTTP/2, HTTP/3). The current implementation specifically uses HTTP/1.1 semantics encoded in Protocol Buffers.

## Implementation Limitations

1. **Limited HTTP Feature Support**: Not all HTTP features (caching, range requests, etc.) are fully implemented
2. **Protocol Buffers Constraints**: Some HTTP structures had to be adapted to work within Protocol Buffers' limitations
3. **Authentication**: Detailed authentication schemes are not yet implemented

## Future Work

1. **Complete Specification Alignment**: Implement `.well-known/libp2p/protocols` resource
2. **Enhanced Authentication**: Implement peer ID authentication schemes
3. **Advanced HTTP Features**: Add support for more HTTP features (caching, conditional requests, etc.)
4. **Performance Optimizations**: Optimize for high-throughput and low-latency scenarios

## Integration with libp2p

The implementation integrates with libp2p through:

1. **Stream Handling**: Uses libp2p's stream multiplexing
2. **Protocol Negotiation**: Registers protocol handler via libp2p's registrar
3. **Connection Management**: Leverages libp2p's connection manager
4. **PeerId Resolution**: Uses libp2p's peer ID system for addressing

```typescript
// Register protocol handler with libp2p
await this.components.registrar.handle(this.protocol, (data) => {
  void this.handleMessage(data)
    .then(async () => {
      await data.stream.close()
    })
    .catch(err => {
      this.log.error('error handling HTTP request - %e', err)
    })
}, {
  maxInboundStreams: this.init.maxInboundStreams,
  maxOutboundStreams: this.init.maxOutboundStreams
})
```

## Conclusion

The HTTP implementation over libp2p provides a robust foundation for HTTP-based communication between libp2p peers. While there are some deviations from the official specification due to practical implementation constraints, the core functionality allows for HTTP semantics over libp2p's transport layer.

The implementation successfully adapts HTTP semantics to the libp2p environment, enabling familiar HTTP patterns in a peer-to-peer context. Future work will focus on closer alignment with the specification and enhanced feature support.
