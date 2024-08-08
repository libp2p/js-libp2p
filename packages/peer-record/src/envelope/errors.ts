/**
 * The key in the record is not valid for the domain
 */
export class InvalidSignatureError extends Error {
  constructor (message = 'Invalid signature') {
    super(message)
    this.name = 'InvalidSignatureError'
  }
}
