import type { Connection, Stream } from '../connection/index.js'

export interface IncomingStreamData {
  stream: Stream
  connection: Connection
}

export interface StreamHandler {
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
}

export interface StreamHandlerRecord {
  handler: StreamHandler
  options: StreamHandlerOptions
}
