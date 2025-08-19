import type { MessageStream } from './message-stream.js'

/**
 * A Stream is a lightweight data channel between two peers that can be written
 * to and read from at both ends.
 *
 * It may be encrypted and multiplexed depending on the configuration of the
 * nodes.
 */
export interface Stream extends MessageStream {
  /**
   * Unique identifier for a stream. Identifiers are not unique across muxers.
   */
  id: string

  /**
   * The protocol negotiated for this stream
   */
  protocol: string
}
