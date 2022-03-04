import type { PeerId } from '@libp2p/interfaces/peer-id'
import type { QueryEvent } from '@libp2p/interfaces/dht'

export interface QueryContext {
  // the key we are looking up
  key: Uint8Array
  // the current peer being queried
  peer: PeerId
  // if this signal emits an 'abort' event, any long-lived processes or requests started as part of this query should be terminated
  signal: AbortSignal
  // which disjoint path we are following
  pathIndex: number
  // the total number of disjoint paths being executed
  numPaths: number
}

/**
 * Query function
 */
export interface QueryFunc {
  (context: QueryContext): AsyncIterable<QueryEvent>
}
