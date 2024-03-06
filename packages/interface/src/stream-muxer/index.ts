import type { Direction, Stream } from '../connection/index.js'
import type { AbortOptions } from '../index.js'
import type { Duplex } from 'it-stream-types'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface StreamMuxerFactory {
  /**
   * The protocol used to select this muxer during connection opening
   */
  protocol: string

  /**
   * Creates a new stream muxer to be used with a new connection
   */
  createStreamMuxer(init?: StreamMuxerInit): StreamMuxer
}

/**
 * A libp2p stream muxer
 */
export interface StreamMuxer extends Duplex<AsyncGenerator<Uint8Array | Uint8ArrayList>> {
  /**
   * The protocol used to select this muxer during connection opening
   */
  protocol: string

  /**
   * A list of streams that are currently open. Closed streams will not be returned.
   */
  readonly streams: Stream[]
  /**
   * Initiate a new stream with the given name. If no name is
   * provided, the id of the stream will be used.
   */
  newStream(name?: string): Stream | Promise<Stream>

  /**
   * Close or abort all tracked streams and stop the muxer
   */
  close(options?: AbortOptions): Promise<void>

  /**
   * Close or abort all tracked streams and stop the muxer
   */
  abort(err: Error): void
}

export interface StreamMuxerInit {
  /**
   * A callback function invoked every time an incoming stream is opened
   */
  onIncomingStream?(stream: Stream): void

  /**
   * A callback function invoke every time a stream ends
   */
  onStreamEnd?(stream: Stream): void

  /**
   * Outbound stream muxers are opened by the local node, inbound stream muxers are opened by the remote
   */
  direction?: Direction
}
