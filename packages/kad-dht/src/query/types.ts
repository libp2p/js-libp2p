import type { QueryEvent } from '../index.js'
import type { PeerId } from '@libp2p/interface'

export interface QueryContext {
  // the key we are looking up
  key: Uint8Array
  // the current peer being queried
  peer: PeerId
  // if this signal emits an 'abort' event, any long-lived processes or requests started as part of this query should be terminated
  signal: AbortSignal
  // which disjoint path we are following
  path: number
  // the total number of disjoint paths being executed
  numPaths: number
}

/**
 * Query function
 */
export interface QueryFunc {
  (context: QueryContext): AsyncIterable<QueryEvent>
}
