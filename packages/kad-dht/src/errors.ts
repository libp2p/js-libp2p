/**
 * An error occurred during a query
 */
export class QueryError extends Error {
  constructor (message = 'Query error') {
    super(message)
    this.name = 'QueryError'
  }
}

/**
 * An invalid record was received
 */
export class InvalidRecordError extends Error {
  constructor (message = 'Invalid record') {
    super(message)
    this.name = 'InvalidRecordError'
  }
}

/**
 * A selector function was missing
 */
export class MissingSelectorError extends Error {
  constructor (message = 'No selector function configured for prefix') {
    super(message)
    this.name = 'MissingSelectorError'
  }
}
