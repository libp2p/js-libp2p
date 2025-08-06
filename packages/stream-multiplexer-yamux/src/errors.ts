import { GoAwayCode } from './frame.ts'

export class ProtocolError extends Error {
  static name = 'ProtocolError'

  public reason: GoAwayCode

  constructor (message: string, reason: GoAwayCode) {
    super(message)
    this.name = 'ProtocolError'
    this.reason = reason
  }
}

export function isProtocolError (err?: any): err is ProtocolError {
  return err?.reason !== null
}

export class InvalidFrameError extends ProtocolError {
  static name = 'InvalidFrameError'

  constructor (message = 'The frame was invalid') {
    super(message, GoAwayCode.ProtocolError)
    this.name = 'InvalidFrameError'
  }
}

export class UnrequestedPingError extends ProtocolError {
  static name = 'UnrequestedPingError'

  constructor (message = 'Unrequested ping error') {
    super(message, GoAwayCode.ProtocolError)
    this.name = 'UnrequestedPingError'
  }
}

export class NotMatchingPingError extends ProtocolError {
  static name = 'NotMatchingPingError'

  constructor (message = 'Unrequested ping error') {
    super(message, GoAwayCode.ProtocolError)
    this.name = 'NotMatchingPingError'
  }
}

export class InvalidStateError extends Error {
  static name = 'InvalidStateError'

  constructor (message = 'Invalid state') {
    super(message)
    this.name = 'InvalidStateError'
  }
}

export class StreamAlreadyExistsError extends ProtocolError {
  static name = 'StreamAlreadyExistsError'

  constructor (message = 'Stream already exists') {
    super(message, GoAwayCode.ProtocolError)
    this.name = 'StreamAlreadyExistsError'
  }
}

export class DecodeInvalidVersionError extends ProtocolError {
  static name = 'DecodeInvalidVersionError'

  constructor (message = 'Decode invalid version') {
    super(message, GoAwayCode.ProtocolError)
    this.name = 'DecodeInvalidVersionError'
  }
}

export class BothClientsError extends ProtocolError {
  static name = 'BothClientsError'

  constructor (message = 'Both clients') {
    super(message, GoAwayCode.ProtocolError)
    this.name = 'BothClientsError'
  }
}

export class ReceiveWindowExceededError extends ProtocolError {
  static name = 'ReceiveWindowExceededError'

  constructor (message = 'Receive window exceeded') {
    super(message, GoAwayCode.ProtocolError)
    this.name = 'ReceiveWindowExceededError'
  }
}
