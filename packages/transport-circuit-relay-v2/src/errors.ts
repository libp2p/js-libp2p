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
