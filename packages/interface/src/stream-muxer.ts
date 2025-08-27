import type { Stream, TypedEventTarget, MessageStream } from './index.js'
import type { AbortOptions } from '@multiformats/multiaddr'

/**
 * User-facing message stream muxer options
 */
export interface StreamMuxerOptions {
  /**
   * Configuration options for each outgoing/incoming stream
   */
  streamOptions?: StreamOptions

  /**
   * libp2p is notified of incoming streams via the muxer's 'stream' event.
   *
   * During connection establishment there may be a small window where a muxer
   * starts to process incoming stream data before a listener has been added for
   * the 'stream' event.
   *
   * If no handler is registered for this event incoming streams can be missed
   * so when this is the case muxers queue streams internally as "early
   * streams", and will defer emitting the 'stream' event until after a listener
   * has been registered.
   *
   * Allowing an unlimited amount of early streams can cause excessive memory
   * consumption so this setting controls how many early streams to store when
   * no 'stream' listener has been registered.
   *
   * If more streams than this are opened before a listener is added the muxed
   * connection will be reset.
   *
   * @default 10
   */
  maxEarlyStreams?: number
}

/**
 * User-facing message stream options
 */
export interface StreamOptions {
  /**
   * If no data is sent or received in this number of ms the stream will be
   * reset and an 'error' event emitted.
   *
   * @default 120_000
   */
  inactivityTimeout?: number

  /**
   * The maximum number of bytes to store when paused or before a 'message'
   * event handler is added.
   *
   * If the internal buffer overflows this value the stream will be reset.
   */
  maxReadBufferLength?: number
}

export interface StreamMuxerFactory<Muxer extends StreamMuxer = StreamMuxer> {
  /**
   * The protocol used to select this muxer during connection opening
   */
  protocol: string

  /**
   * Creates a new stream muxer to be used with a new connection
   */
  createStreamMuxer(maConn: MessageStream): Muxer
}

export interface StreamMuxerEvents<MuxedStream extends Stream = Stream> {
  /**
   * An incoming stream was created
   */
  stream: CustomEvent<MuxedStream>
}

export interface CreateStreamOptions extends AbortOptions, StreamOptions {
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
