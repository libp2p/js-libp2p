/**
 * Signing a message failed
 */
export class SigningError extends Error {
  constructor (message = 'An error occurred while signing a message') {
    super(message)
    this.name = 'SigningError'
  }
}

/**
 * Verifying a message signature failed
 */
export class VerificationError extends Error {
  constructor (message = 'An error occurred while verifying a message') {
    super(message)
    this.name = 'VerificationError'
  }
}

/**
 * WebCrypto was not available in the current context
 */
export class WebCryptoMissingError extends Error {
  constructor (message = 'Missing Web Crypto API') {
    super(message)
    this.name = 'WebCryptoMissingError'
  }
}
