/**
 * A transfer limit was hit
 */
export class TransferLimitError extends Error {
  constructor (message = 'Transfer limit error') {
    super(message)
    this.name = 'TransferLimitError'
  }
}

/**
 * A duration limit was hit
 */
export class DurationLimitError extends Error {
  constructor (message = 'Duration limit error') {
    super(message)
    this.name = 'DurationLimitError'
  }
}

/**
 * There were enough relay reservations already
 */
export class HadEnoughRelaysError extends Error {
  static name: string = 'HadEnoughRelaysError'
  name: string = 'HadEnoughRelaysError'
}

/**
 * An attempt to open a relayed connection over a relayed connection was made
 */
export class DoubleRelayError extends Error {
  static name: string = 'DoubleRelayError'
  name: string = 'DoubleRelayError'
}

/**
 * An attempt to make a reservation on a relay was made while the reservation
 * queue was full
 */
export class RelayQueueFullError extends Error {
  static name: string = 'RelayQueueFullError'
  name: string = 'RelayQueueFullError'
}
