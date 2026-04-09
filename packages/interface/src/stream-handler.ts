import type { AbortOptions, Connection, Stream } from './index.ts'

export interface StreamHandler {
  /**
   * A callback function that accepts the incoming stream data
   */
  (stream: Stream, connection: Connection): void | Promise<void>
}

/**
 * Stream middleware allows accessing stream data outside of the stream handler
 */
export interface StreamMiddleware {
  (stream: Stream, connection: Connection, next: (stream: Stream, connection: Connection) => void): void | Promise<void>
}

export interface StreamHandlerOptions extends AbortOptions {
  /**
   * How many incoming streams can be open for this protocol at the same time on each connection
   *
   * @default 32
   */
  maxInboundStreams?: number

  /**
   * Limits how many new inbound streams can be opened for this protocol per
   * connection within a sliding time window. Use this to prevent malicious
   * peers from flooding built-in protocols (e.g. identify/push).
   *
   * @example
   * // Allow at most 10 new streams per 60 seconds per connection
   * inboundStreamRateLimit: { count: 10, interval: 60_000 }
   */
  inboundStreamRateLimit?: {
    /**
     * Maximum number of new inbound streams allowed within the interval
     */
    count: number
    /**
     * Length of the time window in milliseconds
     */
    interval: number
  }

  /**
   * How many outgoing streams can be open for this protocol at the same time on each connection
   *
   * @default 64
   */
  maxOutboundStreams?: number

  /**
   * Opt-in to running over connections with limits on how much data can be
   * transferred or how long it can be open for.
   */
  runOnLimitedConnection?: boolean

  /**
   * If `true`, and a handler is already registered for the specified
   * protocol(s), the existing handler will be discarded.
   */
  force?: true

  /**
   * Middleware allows accessing stream data outside of the stream handler
   */
  middleware?: StreamMiddleware[]
}

export interface StreamHandlerRecord {
  /**
   * The handler that was registered to handle streams opened on the protocol
   */
  handler: StreamHandler

  /**
   * The options that were used to register the stream handler
   */
  options: StreamHandlerOptions
}
