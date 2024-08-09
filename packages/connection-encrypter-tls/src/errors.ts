/**
 * The handshake timed out
 */
export class HandshakeTimeoutError extends Error {
  constructor (message = 'Handshake timeout') {
    super(message)
    this.name = 'HandshakeTimeoutError'
  }
}

/**
 * The certificate was invalid
 */
export class InvalidCertificateError extends Error {
  constructor (message = 'Invalid certificate') {
    super(message)
    this.name = 'InvalidCertificateError'
  }
}
