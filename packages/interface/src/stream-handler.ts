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
