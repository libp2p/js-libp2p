# HTTP Protocol Design for libp2p

This document details the design decisions and architecture for the HTTP protocol implementation in libp2p, including WebSocket support (RFC 6455).

## Table of Contents

- [Protocol Overview](#protocol-overview)
- [Wire Format](#wire-format)
- [HTTP Implementation](#http-implementation)
- [WebSocket Implementation](#websocket-implementation)
- [Performance Considerations](#performance-considerations)
- [Cross-Environment Compatibility](#cross-environment-compatibility)

## Protocol Overview

The HTTP protocol implementation for libp2p serves several key purposes:

1. Enabling HTTP-based services over libp2p connections
2. Supporting standard HTTP clients and servers in the p2p context
3. Providing WebSocket capabilities for real-time bidirectional communication
4. Enabling decentralized web applications to operate without central servers

The implementation is designed to be RFC-compliant with HTTP/1.1 and WebSocket (RFC 6455) specifications, allowing seamless integration with existing web technologies while leveraging the decentralized nature of libp2p.

## Wire Format

The HTTP protocol uses Protocol Buffers for message serialization over libp2p streams. This provides:

1. Efficient binary encoding for network transmission
2. Language-agnostic interoperability
3. Forward and backward compatibility

The primary message types are:

- `Request`: Representing HTTP requests with method, path, headers, and body
- `Response`: Representing HTTP responses with status code, headers, and body
- `WebSocketFrame`: Representing WebSocket frames according to RFC 6455

The Protocol Buffer definitions ensure consistent message format across different libp2p implementations regardless of language or platform.

## HTTP Implementation

### HTTP Server Architecture

The HTTP server implementation follows these design principles:

1. **Stream-Based Processing**: Each HTTP connection is handled as a libp2p stream
2. **Request-Response Cycle**: Standard HTTP request-response pattern is preserved
3. **Header Handling**: Full support for standard HTTP headers
4. **Content Negotiation**: Supports various content types and encodings
5. **Status Codes**: Full implementation of HTTP status codes

### HTTP Client Architecture

The HTTP client implementation is designed to:

1. **Parse libp2p URLs**: Handle URLs with peer IDs as host components
2. **Connection Management**: Efficiently manage connections to peers
3. **Request Building**: Convert standard Request objects to protocol messages
4. **Response Parsing**: Convert protocol messages back to standard Response objects
5. **Timeout Handling**: Implement request and response timeouts

### Design Decisions

1. **Protocol Identification**: Uses `/http/1.0.0` as the protocol identifier
2. **Stream Multiplexing**: Leverages libp2p's stream multiplexing for concurrent requests
3. **Error Handling**: Standardized error responses follow HTTP conventions
4. **Backpressure**: Respects backpressure signals from the underlying streams
5. **Idempotency**: Preserves HTTP method idempotency semantics

## WebSocket Implementation

### WebSocket Protocol

The WebSocket implementation follows RFC 6455 with complete support for:

1. **Connection Upgrade**: Standard HTTP connection upgrade mechanism
2. **Framing**: Binary framing protocol with control and data frames
3. **Connection Management**: Proper opening and closure procedures
4. **Frame Types**: Text, Binary, Ping, Pong, Close, and Continuation frames
5. **Error Handling**: Standard close codes and error reporting

### Component Design

The WebSocket implementation is structured with a modular architecture:

1. **WebSocketImpl**: Core implementation of the WebSocket interface
   - Manages the overall lifecycle of the WebSocket connection
   - Implements the standard WebSocket API
   - Coordinates between other components

2. **WebSocketFrameHandler**: Processes WebSocket frames
   - Handles frame creation and parsing
   - Manages different frame types (text, binary, control)
   - Dispatches frame data to appropriate handlers

3. **WebSocketStreamHandler**: Manages the underlying stream
   - Reads and writes frames to/from the stream
   - Handles stream errors and closure
   - Implements backpressure mechanisms

4. **WebSocketEventHandler**: Manages event dispatching
   - Efficiently tracks event listeners
   - Optimizes event creation only when listeners exist
   - Provides consistent event dispatching across the implementation

5. **WebSocketConfigManager**: Centralizes configuration
   - Manages timeout settings
   - Controls fragmentation behavior
   - Configures keep-alive mechanisms

6. **WebSocketSignalHandler**: Manages abort signaling
   - Handles graceful cleanup on abort
   - Coordinates proper resource release
   - Ensures timely connection termination

### Key Design Decisions

1. **Event-Based Architecture**: Standard DOM-like event model for familiarity
2. **Performance Optimization**: Events only created when listeners exist
3. **Fragmentation Support**: Automatic message fragmentation for large payloads
4. **Keep-Alive Mechanism**: Optional ping/pong frames for connection health
5. **Graceful Closure**: Proper closure with status codes and reasons

## Performance Considerations

Several optimizations improve the performance of the HTTP implementation:

1. **Event Listener Checks**: Events are only created and dispatched when listeners exist
   - Reduces unnecessary object creation
   - Minimizes CPU overhead for unmonitored events
   - Particularly beneficial for high-frequency events like 'message'

2. **Message Fragmentation**: Large messages are automatically fragmented
   - Prevents blocking operations on large payloads
   - Maintains responsive communication channels
   - Configurable threshold based on application needs

3. **Keep-Alive Mechanism**: Optional ping/pong for connection health
   - Configurable intervals based on application requirements
   - Prevents unnecessary connection drops
   - Reduces reconnection overhead

4. **Component Design**: Modular architecture with clear responsibilities
   - Improves code maintainability
   - Simplifies testing and debugging
   - Allows targeted optimizations

5. **Memory Management**: Careful buffer handling
   - Reuses buffers when possible
   - Avoids unnecessary copies
   - Properly manages large data transfers

## Cross-Environment Compatibility

The implementation ensures consistent behavior across different JavaScript environments:

1. **Environment Detection**: Runtime detection for environment-specific optimizations
2. **Polyfills**: Environment-agnostic event classes via factory functions
3. **Stream Abstractions**: Consistent stream interfaces across Node.js and browsers
4. **Buffer Handling**: Unified approach to buffer management
5. **Testing Strategy**: Tests run in both Node.js and browser environments

By focusing on these compatibility concerns, the HTTP implementation provides consistent behavior regardless of whether it's running in Node.js, a browser, or other JavaScript environments.
