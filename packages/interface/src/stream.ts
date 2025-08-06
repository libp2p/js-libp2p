import type { Logger } from './index.js'
import type { MessageStream } from './message-stream.js'
import type { Uint8ArrayList } from 'uint8arraylist'

export type StreamDirection = 'inbound' | 'outbound'

/**
 * A Stream is a lightweight data channel between two peers that can be written
 * to and read from at both ends.
 *
 * It may be encrypted and multiplexed depending on the configuration of the
 * nodes.
 */
export interface Stream extends MessageStream, AsyncIterable<Uint8Array | Uint8ArrayList> {
  /**
   * Unique identifier for a stream. Identifiers are not unique across muxers.
   */
  id: string

  /**
   * The protocol negotiated for this stream
   */
  protocol: string

  /**
   * Whether this stream is inbound or outbound
   */
  direction: StreamDirection

  /**
   * The stream logger
   */
  log: Logger
}
