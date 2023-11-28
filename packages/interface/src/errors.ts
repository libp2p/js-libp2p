/**
 * When this error is thrown it means an operation was aborted,
 * usually in response to the `abort` event being emitted by an
 * AbortSignal.
 */
export class AbortError extends Error {
  public readonly code: string
  public readonly type: string

  constructor (message: string = 'The operation was aborted') {
    super(message)
    this.code = AbortError.code
    this.type = AbortError.type
  }

  static readonly code = 'ABORT_ERR'

  static readonly type = 'aborted'
}

/**
 * An {@see Error } subclass that defines a `.code` property that calling code
 * can use to detect what type of error has been thrown and act accordingly.
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

export class UnexpectedPeerError extends Error {
  public code: string

  constructor (message = 'Unexpected Peer') {
    super(message)
    this.code = UnexpectedPeerError.code
  }

  static readonly code = 'ERR_UNEXPECTED_PEER'
}

export class InvalidCryptoExchangeError extends Error {
  public code: string

  constructor (message = 'Invalid crypto exchange') {
    super(message)
    this.code = InvalidCryptoExchangeError.code
  }

  static readonly code = 'ERR_INVALID_CRYPTO_EXCHANGE'
}

/**
 * A generic error code indicating that a timeout occurred
 */
export const ERR_TIMEOUT = 'ERR_TIMEOUT'

/**
 * A generic error code indicating that invalid paramters were passed
 */
export const ERR_INVALID_PARAMETERS = 'ERR_INVALID_PARAMETERS'

/**
 * A generic error code indicating that something was not found
 */
export const ERR_NOT_FOUND = 'ERR_NOT_FOUND'

/**
 * A generic error code indicating that the message was invalid
 */
export const ERR_INVALID_MESSAGE = 'ERR_INVALID_MESSAGE'
