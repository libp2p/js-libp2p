export class DoubleNATError extends Error {
  constructor (message = 'Double NAT detected') {
    super(message)
    this.name = 'DoubleNATError'
  }
}

export class InvalidIPAddressError extends Error {
  static name = 'InvalidIPAddressError'
  name = 'InvalidIPAddressError'
}
