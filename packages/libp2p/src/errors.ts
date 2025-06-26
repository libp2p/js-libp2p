export enum messages {
  NOT_STARTED_YET = 'The libp2p node is not started yet',
  NOT_FOUND = 'Not found'
}

export class MissingServiceError extends Error {
  constructor (message = 'Missing service') {
    super(message)
    this.name = 'MissingServiceError'
  }
}

export class UnmetServiceDependenciesError extends Error {
  constructor (message = 'Unmet service dependencies') {
    super(message)
    this.name = 'UnmetServiceDependenciesError'
  }
}

export class NoContentRoutersError extends Error {
  constructor (message = 'No content routers available') {
    super(message)
    this.name = 'NoContentRoutersError'
  }
}

export class NoPeerRoutersError extends Error {
  constructor (message = 'No peer routers available') {
    super(message)
    this.name = 'NoPeerRoutersError'
  }
}

export class QueriedForSelfError extends Error {
  constructor (message = 'Should not try to find self') {
    super(message)
    this.name = 'QueriedForSelfError'
  }
}

export class UnhandledProtocolError extends Error {
  constructor (message = 'Unhandled protocol error') {
    super(message)
    this.name = 'UnhandledProtocolError'
  }
}

export class DuplicateProtocolHandlerError extends Error {
  constructor (message = 'Duplicate protocol handler error') {
    super(message)
    this.name = 'DuplicateProtocolHandlerError'
  }
}

export class DialDeniedError extends Error {
  constructor (message = 'Dial denied error') {
    super(message)
    this.name = 'DialDeniedError'
  }
}

export class UnsupportedListenAddressError extends Error {
  constructor (message = 'No transport was configured to listen on this address') {
    super(message)
    this.name = 'UnsupportedListenAddressError'
  }
}

export class UnsupportedListenAddressesError extends Error {
  constructor (message = 'Configured listen addresses could not be listened on') {
    super(message)
    this.name = 'UnsupportedListenAddressesError'
  }
}

export class NoValidAddressesError extends Error {
  constructor (message = 'No valid addresses') {
    super(message)
    this.name = 'NoValidAddressesError'
  }
}

export class ConnectionInterceptedError extends Error {
  constructor (message = 'Connection intercepted') {
    super(message)
    this.name = 'ConnectionInterceptedError'
  }
}

export class ConnectionDeniedError extends Error {
  constructor (message = 'Connection denied') {
    super(message)
    this.name = 'ConnectionDeniedError'
  }
}

export class MuxerUnavailableError extends Error {
  constructor (message = 'Stream is not multiplexed') {
    super(message)
    this.name = 'MuxerUnavailableError'
  }
}

export class EncryptionFailedError extends Error {
  constructor (message = 'Encryption failed') {
    super(message)
    this.name = 'EncryptionFailedError'
  }
}

export class TransportUnavailableError extends Error {
  constructor (message = 'Transport unavailable') {
    super(message)
    this.name = 'TransportUnavailableError'
  }
}

export class RecursionLimitError extends Error {
  constructor (message = 'Max recursive depth reached') {
    super(message)
    this.name = 'RecursionLimitError'
  }
}
