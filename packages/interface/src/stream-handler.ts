import type { Connection, Stream } from './connection.js'

export interface IncomingStreamData {
  /**
   * The newly opened stream
   */
  stream: Stream

  /**
   * The connection the stream was opened on
   */
  connection: Connection
}

export interface StreamHandler {
  /**
   * A callback function that accepts the incoming stream data
   */
  (data: IncomingStreamData): void
}

export interface StreamHandlerOptions {
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
