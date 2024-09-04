/**
 * When this error is thrown it means an operation was aborted,
 * usually in response to the `abort` event being emitted by an
 * AbortSignal.
 */
export class AbortError extends Error {
  constructor (message: string = 'The operation was aborted') {
    super(message)
    this.name = 'AbortError'
  }
}

/**
 * @deprecated
 */
export class CodeError<T extends Record<string, any> = Record<string, never>> extends Error {
  public readonly props: T

  constructor (
    message: string,
    public readonly code: string,
    props?: T
  ) {
    super(message)

    this.name = props?.name ?? 'CodeError'
    this.props = props ?? {} as T // eslint-disable-line @typescript-eslint/consistent-type-assertions
  }
}

/**
 * @deprecated
 */
export class AggregateCodeError<T extends Record<string, any> = Record<string, never>> extends AggregateError {
  public readonly props: T

  constructor (
    errors: Error[],
    message: string,
    public readonly code: string,
    props?: T
  ) {
    super(errors, message)

    this.name = props?.name ?? 'AggregateCodeError'
    this.props = props ?? {} as T // eslint-disable-line @typescript-eslint/consistent-type-assertions
  }
}

export class UnexpectedPeerError extends Error {
  constructor (message = 'Unexpected Peer') {
    super(message)
    this.name = 'UnexpectedPeerError'
  }
}

export class InvalidCryptoExchangeError extends Error {
  constructor (message = 'Invalid crypto exchange') {
    super(message)
    this.name = 'InvalidCryptoExchangeError'
  }
}

export class InvalidParametersError extends Error {
  constructor (message = 'Invalid parameters') {
    super(message)
    this.name = 'InvalidParametersError'
  }
}

export class InvalidPublicKeyError extends Error {
  constructor (message = 'Invalid public key') {
    super(message)
    this.name = 'InvalidPublicKeyError'
  }
}

export class InvalidPrivateKeyError extends Error {
  constructor (message = 'Invalid private key') {
    super(message)
    this.name = 'InvalidPrivateKeyError'
  }
}

export class UnsupportedOperationError extends Error {
  constructor (message = 'Unsupported operation') {
    super(message)
    this.name = 'UnsupportedOperationError'
  }
}

export class ConnectionClosingError extends Error {
  constructor (message = 'The connection is closing') {
    super(message)
    this.name = 'ConnectionClosingError'
  }
}

export class ConnectionClosedError extends Error {
  constructor (message = 'The connection is closed') {
    super(message)
    this.name = 'ConnectionClosedError'
  }
}

export class ConnectionFailedError extends Error {
  constructor (message = 'Connection failed') {
    super(message)
    this.name = 'ConnectionFailedError'
  }
}

export class StreamResetError extends Error {
  constructor (message = 'The stream has been reset') {
    super(message)
    this.name = 'StreamResetError'
  }
}

export class StreamStateError extends Error {
  constructor (message = 'The stream is in an invalid state') {
    super(message)
    this.name = 'StreamStateError'
  }
}

export class NotFoundError extends Error {
  constructor (message = 'Not found') {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class InvalidPeerIdError extends Error {
  constructor (message = 'Invalid PeerID') {
    super(message)
    this.name = 'InvalidPeerIdError'
  }
}

export class InvalidMultiaddrError extends Error {
  constructor (message = 'Invalid multiaddr') {
    super(message)
    this.name = 'InvalidMultiaddrError'
  }
}

export class InvalidCIDError extends Error {
  constructor (message = 'Invalid CID') {
    super(message)
    this.name = 'InvalidCIDError'
  }
}

export class InvalidMultihashError extends Error {
  constructor (message = 'Invalid Multihash') {
    super(message)
    this.name = 'InvalidMultihashError'
  }
}

export class UnsupportedProtocolError extends Error {
  constructor (message = 'Unsupported protocol error') {
    super(message)
    this.name = 'UnsupportedProtocolError'
  }
}

/**
 * An invalid or malformed message was encountered during a protocol exchange
 */
export class InvalidMessageError extends Error {
  constructor (message = 'Invalid message') {
    super(message)
    this.name = 'InvalidMessageError'
  }
}

export class ProtocolError extends Error {
  constructor (message = 'Protocol error') {
    super(message)
    this.name = 'ProtocolError'
  }
}

export class TimeoutError extends Error {
  constructor (message = 'Timed out') {
    super(message)
    this.name = 'TimeoutError'
  }
}

export class NotStartedError extends Error {
  constructor (message = 'Not started') {
    super(message)
    this.name = 'NotStartedError'
  }
}

export class AlreadyStartedError extends Error {
  constructor (message = 'Already started') {
    super(message)
    this.name = 'AlreadyStartedError'
  }
}

export class DialError extends Error {
  constructor (message = 'Dial error') {
    super(message)
    this.name = 'DialError'
  }
}

export class ListenError extends Error {
  constructor (message = 'Listen error') {
    super(message)
    this.name = 'ListenError'
  }
}

export class LimitedConnectionError extends Error {
  constructor (message = 'Limited connection') {
    super(message)
    this.name = 'LimitedConnectionError'
  }
}

export class TooManyInboundProtocolStreamsError extends Error {
  constructor (message = 'Too many inbound protocol streams') {
    super(message)
    this.name = 'TooManyInboundProtocolStreamsError'
  }
}

export class TooManyOutboundProtocolStreamsError extends Error {
  constructor (message = 'Too many outbound protocol streams') {
    super(message)
    this.name = 'TooManyOutboundProtocolStreamsError'
  }
}

/**
 * Thrown when and attempt to operate on an unsupported key was made
 */
export class UnsupportedKeyTypeError extends Error {
  constructor (message = 'Unsupported key type') {
    super(message)
    this.name = 'UnsupportedKeyTypeError'
  }
}
