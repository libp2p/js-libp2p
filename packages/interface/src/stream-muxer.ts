import type { Stream, MultiaddrConnection, TypedEventTarget } from './index.js'
import type { AbortOptions } from '@multiformats/multiaddr'

export interface StreamMuxerFactory<Muxer extends StreamMuxer = StreamMuxer> {
  /**
   * The protocol used to select this muxer during connection opening
   */
  protocol: string

  /**
   * Creates a new stream muxer to be used with a new connection
   */
  createStreamMuxer(maConn: MultiaddrConnection): Muxer
}

export interface StreamMuxerEvents<MuxedStream extends Stream = Stream> {
  /**
   * An incoming stream was created
   */
  stream: CustomEvent<MuxedStream>
}

export interface CreateStreamOptions extends AbortOptions {
  /**
   * If a single protocol was requested and the muxer has support for this,
   * pre-negotiate the protocol using this value, otherwise multistream-select
   * will be run over the stream after opening.
   */
  protocol?: string
}

export type StreamMuxerStatus = 'open' | 'closing' | 'closed'

/**
 * A libp2p stream muxer
 */
export interface StreamMuxer<MuxedStream extends Stream = Stream> extends TypedEventTarget<StreamMuxerEvents<MuxedStream>> {
  /**
   * The protocol used to select this muxer during connection opening
   */
  protocol: string

  /**
   * A list of streams that are currently open
   */
  streams: MuxedStream[]

  /**
   * The status of the muxer
   */
  status: StreamMuxerStatus

  /**
   * Create a new stream
   */
  createStream(options?: CreateStreamOptions): MuxedStream | Promise<MuxedStream>

  /**
   * Immediately close the muxer, abort every open stream and discard any
   * unsent/unread data.
   */
  abort (err: Error): void

  /**
   * Gracefully close the muxer. All open streams will be gracefully closed, and
   * the returned promise will either resolve when any/all unsent data has been
   * sent, or it will reject if the passed abort signal fires before this
   * happens.
   */
  close (options?: AbortOptions): Promise<void>
}
