/**
 * When this error is thrown it means an operation was aborted,
 * usually in response to the `abort` event being emitted by an
 * AbortSignal.
 * 
 * @example
 *
 * ```TypeScript
 * throw new AbortError('The operation was aborted')
 * ```
 */
export class AbortError extends Error {
  /**
   * The name of the error.
   */
  static name = 'AbortError'

  /**
   * Creates a new AbortError instance.
   * 
   * @param message - The message for the error.
   */
  constructor (message: string = 'The operation was aborted') {
    super(message)
    this.name = 'AbortError'
  }
}

/**
 * Thrown when a remote Peer ID does not match the expected one
 * 
 * @example
 *
 * ```TypeScript
 * throw new UnexpectedPeerError('Unexpected peer')
 * ```
 */
export class UnexpectedPeerError extends Error {
  /**
   * The name of the error.
   */
  static name = 'UnexpectedPeerError'

  /**
   * Creates a new UnexpectedPeerError instance.
   * 
   * @param message - The message for the error.
   */
  constructor (message = 'Unexpected Peer') {
    super(message)
    this.name = 'UnexpectedPeerError'
  }
}

/**
 * Thrown when a crypto exchange fails
 * 
 * @example
 *
 * ```TypeScript
 * throw new InvalidCryptoExchangeError('Invalid crypto exchange')
 * ```
 */
export class InvalidCryptoExchangeError extends Error {
  /**
   * The name of the error.
   */
  static name = 'InvalidCryptoExchangeError'

  /**
   * Creates a new InvalidCryptoExchangeError instance.
   * 
   * @param message - The message for the error.
   */
  constructor (message = 'Invalid crypto exchange') {
    super(message)
    this.name = 'InvalidCryptoExchangeError'
  }
}

/**
 * Thrown when invalid parameters are passed to a function or method call
 * 
 * @example
 *
 * ```TypeScript
 * throw new InvalidParametersError('Invalid parameters')
 * ```
 */
export class InvalidParametersError extends Error {
  /**
   * The name of the error.
   */
  static name = 'InvalidParametersError'

  /**
   * Creates a new InvalidParametersError instance.
   * 
   * @param message - The message for the error.
   */
  constructor (message = 'Invalid parameters') {
    super(message)
    this.name = 'InvalidParametersError'
  }
}

/**
 * Thrown when a public key is invalid
 * 
 * @example
 *
 * ```TypeScript
 * throw new InvalidPublicKeyError('Invalid public key')
 * ```
 */
export class InvalidPublicKeyError extends Error {
  /**
   * The name of the error.
   */
  static name = 'InvalidPublicKeyError'

  /**
   * Creates a new InvalidPublicKeyError instance.
   * 
   * @param message - The message for the error.
   */
  constructor (message = 'Invalid public key') {
    super(message)
    this.name = 'InvalidPublicKeyError'
  }
}

/**
 * Thrown when a private key is invalid
 * 
 * @example
 *
 * ```TypeScript
 * throw new InvalidPrivateKeyError('Invalid private key')
 * ```
 */
export class InvalidPrivateKeyError extends Error {
  /**
   * The name of the error.
   */
  static name = 'InvalidPrivateKeyError'

  /**
   * Creates a new InvalidPrivateKeyError instance.
   * 
   * @param message - The message for the error.
   */
  constructor (message = 'Invalid private key') {
    super(message)
    this.name = 'InvalidPrivateKeyError'
  }
}

/**
 * Thrown when a operation is unsupported
 * 
 * @example
 *
 * ```TypeScript
 * throw new UnsupportedOperationError('Unsupported operation')
 * ```
 */
export class UnsupportedOperationError extends Error {
  /**
   * The name of the error.
   */
  static name = 'UnsupportedOperationError'

  /**
   * Creates a new UnsupportedOperationError instance.
   * 
   * @param message - The message for the error.
   */
  constructor (message = 'Unsupported operation') {
    super(message)
    this.name = 'UnsupportedOperationError'
  }
}

/**
 * Thrown when a connection is closing
 * 
 * @example
 *
 * ```TypeScript
 * throw new ConnectionClosingError('The connection is closing')
 * ```
 */
export class ConnectionClosingError extends Error {
  /**
   * The name of the error.
   */
  static name = 'ConnectionClosingError'

  /**
   * Creates a new ConnectionClosingError instance.
   * 
   * @param message - The message for the error.
   */
  constructor (message = 'The connection is closing') {
    super(message)
    this.name = 'ConnectionClosingError'
  }
}

/**
 * Thrown when a connection is closed
 * 
 * @example
 *
 * ```TypeScript
 * throw new ConnectionClosedError('The connection is closed')
 * ```
 */
export class ConnectionClosedError extends Error {
  /**
   * The name of the error.
   */
  static name = 'ConnectionClosedError'

  /**
   * Creates a new ConnectionClosedError instance.
   * 
   * @param message - The message for the error.
   */
  constructor (message = 'The connection is closed') {
    super(message)
    this.name = 'ConnectionClosedError'
  }
}

/**
 * Thrown when a connection fails
 * 
 * @example
 *
 * ```TypeScript
 * throw new ConnectionFailedError('Connection failed')
 * ```
 */
export class ConnectionFailedError extends Error {
  /**
   * The name of the error.
   */
  static name = 'ConnectionFailedError'

  /**
   * Creates a new ConnectionFailedError instance.
   * 
   * @param message - The message for the error.
   */
  constructor (message = 'Connection failed') {
    super(message)
    this.name = 'ConnectionFailedError'
  }
}

/**
 * Thrown when the muxer is closed and an attempt to open a stream occurs
 * 
 * @example
 *
 * ```TypeScript
 * throw new MuxerClosedError('The muxer is closed')
 * ```
 */
export class MuxerClosedError extends Error {
  /**
   * The name of the error.
   */
  static name = 'MuxerClosedError'

  /**
   * Creates a new MuxerClosedError instance.
   * 
   * @param message - The message for the error.
   */
  constructor (message = 'The muxer is closed') {
    super(message)
    this.name = 'MuxerClosedError'
  }
}

/**
 * Thrown when a protocol stream is reset by the remote muxer
 * 
 * @example
 *
 * ```TypeScript
 * throw new StreamResetError('The stream has been reset')
 * ```
 */
export class StreamResetError extends Error {
  /**
   * The name of the error.
   */
  static name = 'StreamResetError'

  /**
   * Creates a new StreamResetError instance.
   * 
   * @param message - The message for the error.
   */
  constructor (message = 'The stream has been reset') {
    super(message)
    this.name = 'StreamResetError'
  }
}

/**
 * Thrown when a stream is in an invalid state
 * 
 * @example
 *
 * ```TypeScript
 * throw new StreamStateError('The stream is in an invalid state')
 * ```
 */
export class StreamStateError extends Error {
  /**
   * The name of the error.
   */
  static name = 'StreamStateError'

  /**
   * Creates a new StreamStateError instance.
   * 
   * @param message - The message for the error.
   */
  constructor (message = 'The stream is in an invalid state') {
    super(message)
    this.name = 'StreamStateError'
  }
}

/**
 * Thrown when a value could not be found
 * 
 * @example
 *
 * ```TypeScript
 * throw new NotFoundError('Not found')
 * ```
 */
export class NotFoundError extends Error {
  /**
   * The name of the error.
   */
  static name = 'NotFoundError'

  /**
   * Creates a new NotFoundError instance.
   * 
   * @param message - The message for the error.
   */
  constructor (message = 'Not found') {
    super(message)
    this.name = 'NotFoundError'
  }
}

/**
 * Thrown when an invalid peer ID is encountered
 * 
 * @example
 *
 * ```TypeScript
 * throw new InvalidPeerIdError('Invalid PeerID')
 * ```
 */
export class InvalidPeerIdError extends Error {
  /**
   * The name of the error.
   */
  static name = 'InvalidPeerIdError'

  /**
   * Creates a new InvalidPeerIdError instance.
   * 
   * @param message - The message for the error.
   */
  constructor (message = 'Invalid PeerID') {
    super(message)
    this.name = 'InvalidPeerIdError'
  }
}

/**
 * Thrown when an invalid multiaddr is encountered
 * 
 * @example
 *
 * ```TypeScript
 * throw new InvalidMultiaddrError('Invalid multiaddr')
 * ```
 */
export class InvalidMultiaddrError extends Error {
  /**
   * The name of the error.
   */
  static name = 'InvalidMultiaddrError'

  /**
   * Creates a new InvalidMultiaddrError instance.
   * 
   * @param message - The message for the error.
   */
  constructor (message = 'Invalid multiaddr') {
    super(message)
    this.name = 'InvalidMultiaddrError'
  }
}

/**
 * Thrown when an invalid CID is encountered
 * 
 * @example
 *
 * ```TypeScript
 * throw new InvalidCIDError('Invalid CID')
 * ```
 */
export class InvalidCIDError extends Error {
  /**
   * The name of the error.
   */
  static name = 'InvalidCIDError'

  /**
   * Creates a new InvalidCIDError instance.
   * 
   * @param message - The message for the error.
   */
  constructor (message = 'Invalid CID') {
    super(message)
    this.name = 'InvalidCIDError'
  }
}

/**
 * Thrown when an invalid multihash is encountered
 * 
 * @example
 *
 * ```TypeScript
 * throw new InvalidMultihashError('Invalid Multihash')
 * ```
 */
export class InvalidMultihashError extends Error {
  /**
   * The name of the error.
   */
  static name = 'InvalidMultihashError'

  /**
   * Creates a new InvalidMultihashError instance.
   * 
   * @param message - The message for the error.
   */
  constructor (message = 'Invalid Multihash') {
    super(message)
    this.name = 'InvalidMultihashError'
  }
}

/**
 * Thrown when a protocol is not supported
 * 
 * @example
 *
 * ```TypeScript
 * throw new UnsupportedProtocolError('Unsupported protocol error')
 * ```
 */
export class UnsupportedProtocolError extends Error {
  /**
   * The name of the error.
   */
  static name = 'UnsupportedProtocolError'

  /**
   * Creates a new UnsupportedProtocolError instance.
   * 
   * @param message - The message for the error.
   */
  constructor (message = 'Unsupported protocol error') {
    super(message)
    this.name = 'UnsupportedProtocolError'
  }
}

/**
 * An invalid or malformed message was encountered during a protocol exchange
 * 
 * @example
 *
 * ```TypeScript
 * throw new InvalidMessageError('Invalid message')
 * ```
 */
export class InvalidMessageError extends Error {
  /**
   * The name of the error.
   */
  static name = 'InvalidMessageError'

  /**
   * Creates a new InvalidMessageError instance.
   * 
   * @param message - The message for the error.
   */
  constructor (message = 'Invalid message') {
    super(message)
    this.name = 'InvalidMessageError'
  }
}

/**
 * Thrown when a remote peer sends a structurally valid message that does not
 * comply with the protocol
 * 
 * @example
 *
 * ```TypeScript
 * throw new ProtocolError('Protocol error')
 * ```
 */
export class ProtocolError extends Error {
  /**
   * The name of the error.
   */
  static name = 'ProtocolError'

  /**
   * Creates a new ProtocolError instance.
   * 
   * @param message - The message for the error.
   */
  constructor (message = 'Protocol error') {
    super(message)
    this.name = 'ProtocolError'
  }
}

/**
 * Throw when an operation times out
 * 
 * @example
 *
 * ```TypeScript
 * throw new TimeoutError('Timed out')
 * ```
 */
export class TimeoutError extends Error {
  /**
   * The name of the error.
   */
  static name = 'TimeoutError'

  /**
   * Creates a new TimeoutError instance.
   * 
   * @param message - The message for the error.
   */
  constructor (message = 'Timed out') {
    super(message)
    this.name = 'TimeoutError'
  }
}

/**
 * Thrown when a startable component is interacted with but it has not been
 * started yet
 * 
 * @example
 *
 * ```TypeScript
 * throw new NotStartedError('Not started')
 * ```
 */
export class NotStartedError extends Error {
  /**
   * The name of the error.
   */
  static name = 'NotStartedError'

  /**
   * Creates a new NotStartedError instance.
   * 
   * @param message - The message for the error.
   */
  constructor (message = 'Not started') {
    super(message)
    this.name = 'NotStartedError'
  }
}

/**
 * Thrown when a component is started that has already been started
 * 
 * @example
 *
 * ```TypeScript
 * throw new AlreadyStartedError('Already started')
 * ```
 */
export class AlreadyStartedError extends Error {
  /**
   * The name of the error.
   */
  static name = 'AlreadyStartedError'

  /**
   * Creates a new AlreadyStartedError instance.
   * 
   * @param message - The message for the error.
   */
  constructor (message = 'Already started') {
    super(message)
    this.name = 'AlreadyStartedError'
  }
}

/**
 * Thrown when dialing an address failed
 * 
 * @example
 *
 * ```TypeScript
 * throw new DialError('Dial error')
 * ```
 */
export class DialError extends Error {
  /**
   * The name of the error.
   */
  static name = 'DialError'

  /**
   * Creates a new DialError instance.
   * 
   * @param message - The message for the error.
   */
  constructor (message = 'Dial error') {
    super(message)
    this.name = 'DialError'
  }
}

/**
 * Thrown when listening on an address failed
 * 
 * @example
 *
 * ```TypeScript
 * throw new ListenError('Listen error')
 * ```
 */
export class ListenError extends Error {
  /**
   * The name of the error.
   */
  static name = 'ListenError'

  /**
   * Creates a new ListenError instance.
   * 
   * @param message - The message for the error.
   */
  constructor (message = 'Listen error') {
    super(message)
    this.name = 'ListenError'
  }
}

/**
 * This error is thrown when a limited connection is encountered, i.e. if the
 * user tried to open a stream on a connection for a protocol that is not
 * configured to run over limited connections.
 * 
 * @example
 *
 * ```TypeScript
 * throw new LimitedConnectionError('Limited connection')
 * ```
 */
export class LimitedConnectionError extends Error {
  /**
   * The name of the error.
   */
  static name = 'LimitedConnectionError'

  /**
   * Creates a new LimitedConnectionError instance.
   * 
   * @param message - The message for the error.
   */
  constructor (message = 'Limited connection') {
    super(message)
    this.name = 'LimitedConnectionError'
  }
}

/**
 * This error is thrown where there are too many inbound protocols streams open
 * 
 * @example
 *
 * ```TypeScript
 * throw new TooManyInboundProtocolStreamsError('Too many inbound protocol streams')
 * ```
 */
export class TooManyInboundProtocolStreamsError extends Error {
  /**
   * The name of the error.
   */
  static name = 'TooManyInboundProtocolStreamsError'

  /**
   * Creates a new TooManyInboundProtocolStreamsError instance.
   * 
   * @param message - The message for the error.
   */
  constructor (message = 'Too many inbound protocol streams') {
    super(message)
    this.name = 'TooManyInboundProtocolStreamsError'
  }
}

/**
 * This error is thrown where there are too many outbound protocols streams open
 * 
 * @example
 *
 * ```TypeScript
 * throw new TooManyOutboundProtocolStreamsError('Too many outbound protocol streams')
 * ```
 */
export class TooManyOutboundProtocolStreamsError extends Error {
  /**
   * The name of the error.
   */
  static name = 'TooManyOutboundProtocolStreamsError'

  /**
   * Creates a new TooManyOutboundProtocolStreamsError instance.
   * 
   * @param message - The message for the error.
   */
  constructor (message = 'Too many outbound protocol streams') {
    super(message)
    this.name = 'TooManyOutboundProtocolStreamsError'
  }
}

/**
 * Thrown when and attempt to operate on an unsupported key was made
 * 
 * @example
 *
 * ```TypeScript
 * throw new UnsupportedKeyTypeError('Unsupported key type')
 * ```
 */
export class UnsupportedKeyTypeError extends Error {
  /**
   * The name of the error.
   */
  static name = 'UnsupportedKeyTypeError'

  /**
   * Creates a new UnsupportedKeyTypeError instance.
   * 
   * @param message - The message for the error.
   */
  constructor (message = 'Unsupported key type') {
    super(message)
    this.name = 'UnsupportedKeyTypeError'
  }
}
