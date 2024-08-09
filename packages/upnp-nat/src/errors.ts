export class DoubleNATError extends Error {
  constructor (message = 'Double NAT detected') {
    super(message)
    this.name = 'DoubleNATError'
  }
}
