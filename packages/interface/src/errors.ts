/**
 * When this error is thrown it means an operation was aborted,
 * usually in response to the `abort` event being emitted by an
 * AbortSignal.
 */
export class AbortError extends Error {
  static name = 'AbortError'

  constructor (message: string = 'The operation was aborted') {
    super(message)
    this.name = 'AbortError'
  }
}

/**
 * Thrown when a remote Peer ID does not match the expected one
 */
export class UnexpectedPeerError extends Error {
  static name = 'UnexpectedPeerError'

  constructor (message = 'Unexpected Peer') {
    super(message)
    this.name = 'UnexpectedPeerError'
  }
}

/**
 * Thrown when a crypto exchange fails
 */
export class InvalidCryptoExchangeError extends Error {
  static name = 'InvalidCryptoExchangeError'

  constructor (message = 'Invalid crypto exchange') {
    super(message)
    this.name = 'InvalidCryptoExchangeError'
  }
}

/**
 * Thrown when invalid parameters are passed to a function or method call
 */
export class InvalidParametersError extends Error {
  static name = 'InvalidParametersError'

  constructor (message = 'Invalid parameters') {
    super(message)
    this.name = 'InvalidParametersError'
  }
}

/**
 * Thrown when a public key is invalid
 */
export class InvalidPublicKeyError extends Error {
  static name = 'InvalidPublicKeyError'

  constructor (message = 'Invalid public key') {
    super(message)
    this.name = 'InvalidPublicKeyError'
  }
}

/**
 * Thrown when a private key is invalid
 */
export class InvalidPrivateKeyError extends Error {
  static name = 'InvalidPrivateKeyError'

  constructor (message = 'Invalid private key') {
    super(message)
    this.name = 'InvalidPrivateKeyError'
  }
}

/**
 * Thrown when a operation is unsupported
 */
export class UnsupportedOperationError extends Error {
  static name = 'UnsupportedOperationError'

  constructor (message = 'Unsupported operation') {
    super(message)
    this.name = 'UnsupportedOperationError'
  }
}

/**
 * Thrown when a connection is closing
 */
export class ConnectionClosingError extends Error {
  static name = 'ConnectionClosingError'

  constructor (message = 'The connection is closing') {
    super(message)
    this.name = 'ConnectionClosingError'
  }
}

/**
 * Thrown when a connection is closed
 */
export class ConnectionClosedError extends Error {
  static name = 'ConnectionClosedError'

  constructor (message = 'The connection is closed') {
    super(message)
    this.name = 'ConnectionClosedError'
  }
}

/**
 * Thrown when a connection fails
 */
export class ConnectionFailedError extends Error {
  static name = 'ConnectionFailedError'

  constructor (message = 'Connection failed') {
    super(message)
    this.name = 'ConnectionFailedError'
  }
}

/**
 * Thrown when the muxer is closed and an attempt to open a stream occurs
 */
export class MuxerClosedError extends Error {
  static name = 'MuxerClosedError'

  constructor (message = 'The muxer is closed') {
    super(message)
    this.name = 'MuxerClosedError'
  }
}

/**
 * Thrown when a protocol stream is reset by the remote muxer
 */
export class StreamResetError extends Error {
  static name = 'StreamResetError'

  constructor (message = 'The stream has been reset') {
    super(message)
    this.name = 'StreamResetError'
  }
}

/**
 * Thrown when a stream is in an invalid state
 */
export class StreamStateError extends Error {
  static name = 'StreamStateError'

  constructor (message = 'The stream is in an invalid state') {
    super(message)
    this.name = 'StreamStateError'
  }
}

/**
 * Thrown when a value could not be found
 */
export class NotFoundError extends Error {
  static name = 'NotFoundError'

  constructor (message = 'Not found') {
    super(message)
    this.name = 'NotFoundError'
  }
}

/**
 * Thrown when an invalid peer ID is encountered
 */
export class InvalidPeerIdError extends Error {
  static name = 'InvalidPeerIdError'

  constructor (message = 'Invalid PeerID') {
    super(message)
    this.name = 'InvalidPeerIdError'
  }
}

/**
 * Thrown when an invalid multiaddr is encountered
 */
export class InvalidMultiaddrError extends Error {
  static name = 'InvalidMultiaddrError'

  constructor (message = 'Invalid multiaddr') {
    super(message)
    this.name = 'InvalidMultiaddrError'
  }
}

/**
 * Thrown when an invalid CID is encountered
 */
export class InvalidCIDError extends Error {
  static name = 'InvalidCIDError'

  constructor (message = 'Invalid CID') {
    super(message)
    this.name = 'InvalidCIDError'
  }
}

/**
 * Thrown when an invalid multihash is encountered
 */
export class InvalidMultihashError extends Error {
  static name = 'InvalidMultihashError'

  constructor (message = 'Invalid Multihash') {
    super(message)
    this.name = 'InvalidMultihashError'
  }
}

/**
 * Thrown when a protocol is not supported
 */
export class UnsupportedProtocolError extends Error {
  static name = 'UnsupportedProtocolError'

  constructor (message = 'Unsupported protocol error') {
    super(message)
    this.name = 'UnsupportedProtocolError'
  }
}

/**
 * An invalid or malformed message was encountered during a protocol exchange
 */
export class InvalidMessageError extends Error {
  static name = 'InvalidMessageError'

  constructor (message = 'Invalid message') {
    super(message)
    this.name = 'InvalidMessageError'
  }
}

/**
 * Thrown when a remote peer sends a structurally valid message that does not
 * comply with the protocol
 */
export class ProtocolError extends Error {
  static name = 'ProtocolError'

  constructor (message = 'Protocol error') {
    super(message)
    this.name = 'ProtocolError'
  }
}

/**
 * Throw when an operation times out
 */
export class TimeoutError extends Error {
  static name = 'TimeoutError'

  constructor (message = 'Timed out') {
    super(message)
    this.name = 'TimeoutError'
  }
}

/**
 * Thrown when a startable component is interacted with but it has not been
 * started yet
 */
export class NotStartedError extends Error {
  static name = 'NotStartedError'

  constructor (message = 'Not started') {
    super(message)
    this.name = 'NotStartedError'
  }
}

/**
 * Thrown when a component is started that has already been started
 */
export class AlreadyStartedError extends Error {
  static name = 'AlreadyStartedError'

  constructor (message = 'Already started') {
    super(message)
    this.name = 'AlreadyStartedError'
  }
}

/**
 * Thrown when dialing an address failed
 */
export class DialError extends Error {
  static name = 'DialError'

  constructor (message = 'Dial error') {
    super(message)
    this.name = 'DialError'
  }
}

/**
 * Thrown when listening on an address failed
 */
export class ListenError extends Error {
  static name = 'ListenError'

  constructor (message = 'Listen error') {
    super(message)
    this.name = 'ListenError'
  }
}

/**
 * This error is thrown when a limited connection is encountered, i.e. if the
 * user tried to open a stream on a connection for a protocol that is not
 * configured to run over limited connections.
 */
export class LimitedConnectionError extends Error {
  static name = 'LimitedConnectionError'

  constructor (message = 'Limited connection') {
    super(message)
    this.name = 'LimitedConnectionError'
  }
}

/**
 * This error is thrown where there are too many inbound protocols streams open
 */
export class TooManyInboundProtocolStreamsError extends Error {
  static name = 'TooManyInboundProtocolStreamsError'

  constructor (message = 'Too many inbound protocol streams') {
    super(message)
    this.name = 'TooManyInboundProtocolStreamsError'
  }
}

/**
 * This error is thrown where there are too many outbound protocols streams open
 */
export class TooManyOutboundProtocolStreamsError extends Error {
  static name = 'TooManyOutboundProtocolStreamsError'

  constructor (message = 'Too many outbound protocol streams') {
    super(message)
    this.name = 'TooManyOutboundProtocolStreamsError'
  }
}

/**
 * Thrown when and attempt to operate on an unsupported key was made
 */
export class UnsupportedKeyTypeError extends Error {
  static name = 'UnsupportedKeyTypeError'

  constructor (message = 'Unsupported key type') {
    super(message)
    this.name = 'UnsupportedKeyTypeError'
  }
}
