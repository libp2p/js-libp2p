import type * as Status from './status.js'
import type { AbortOptions } from '../index.js'
import type { PeerId } from '../peer-id/index.js'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { Duplex, Source } from 'it-stream-types'

export interface ConnectionTimeline {
  open: number
  upgraded?: number
  close?: number
}

/**
 * Outbound conections are opened by the local node, inbound streams are opened by the remote
 */
export type Direction = 'inbound' | 'outbound'

export interface StreamTimeline {
  /**
   * A timestamp of when the stream was opened
   */
  open: number

  /**
   * A timestamp of when the stream was closed for both reading and writing
   */
  close?: number

  /**
   * A timestamp of when the stream was closed for reading
   */
  closeRead?: number

  /**
   * A timestamp of when the stream was closed for writing
   */
  closeWrite?: number

  /**
   * A timestamp of when the stream was reset
   */
  reset?: number
}

/**
 * Similar to a TransformStream but the properties are not readonly
 */
export interface ByteStream {
  /**
   * Data from the remote end of the stream is read using the stream readable
   */
  readable: ReadableStream<Uint8Array>

  /**
   * Data is sent to the remote end of the string using the stream writable
   */
  writable: WritableStream<Uint8Array>
}

/**
 * A RawStream is a data channel between two peers that can be written to and
 * read from at both ends.
 *
 * It has yet to have a protocol negotiated that will determine the agreed
 * format of data transferred over it.
 */
export interface RawStream extends ByteStream {
  /**
   * Gracefully closes the stream for reading and writing.
   *
   * Any buffered data in the source can still be consumed and the stream will
   * end normally.
   *
   * This will cause a `CLOSE` message to be sent to the remote unless the
   * sink has already ended.
   *
   * An abort signal can be passed, if it emits an 'abort' event an error will
   * be thrown and the stream will be closed immediately - if this happens any
   * queued data will be discarded.
   */
  close: (options?: AbortOptions) => Promise<void>

  /**
   * Immediately closes the stream for reading and writing, discarding any
   * queued data. This should be called when a local error has occurred.
   *
   * This will cause a `RESET` message to be sent to the remote, unless the sink
   * has already ended.
   *
   * The sink will return and the source will throw if an error is passed or
   * return normally if not.
   */
  abort: (err: Error) => void

  /**
   * Unique identifier for a stream. Identifiers are not unique across muxers.
   */
  id: string

  /**
   * Outbound streams are opened by the local node, inbound streams are opened by
   * the remote
   */
  direction: Direction

  /**
   * Lifecycle times for the stream
   */
  timeline: StreamTimeline

  /**
   * User defined stream metadata
   */
  metadata: Record<string, any>
}

/**
 * A Stream is a RawStream that has had a protocol negotiated to define the
 * format of data transferred over it.
 */
export interface Stream extends RawStream {
  /**
   * The protocol that was negotiated for this stream
   */
  protocol: string
}

export interface NewStreamOptions extends AbortOptions {
  /**
   * If specified, and no handler has been registered with the registrar for the
   * successfully negotiated protocol, use this as the max outbound stream limit
   * for the protocol
   */
  maxOutboundStreams?: number
}

/**
 * A Connection is a high-level representation of a connection
 * to a remote peer that may have been secured by encryption and
 * multiplexed, depending on the configuration of the nodes
 * between which the connection is made.
 */
export interface Connection {
  /**
   * The unique identifier for this connection
   */
  id: string

  /**
   * The remote address of the connection
   */
  remoteAddr: Multiaddr

  /**
   * The PeerId of the node at the other end of the connection
   */
  remotePeer: PeerId

  /**
   * Use specified tags for this connection
   */
  tags: string[]

  /**
   * Open streams on this connection (requires a multiplexer to be configured)
   */
  streams: Stream[]

  /**
   * Outbound connections are opened by the local node, inbound streams are opened by the remote
   */
  direction: Direction

  /**
   * Lifecycle times for the connection
   */
  timeline: ConnectionTimeline

  /**
   * Once a multiplexer has been negotiated for this stream, it will be set on the stat object
   */
  multiplexer?: string

  /**
   * Once a connection encrypter has been negotiated for this stream, it will be set on the stat object
   */
  encryption?: string

  /**
   * The current status of the connection
   */
  status: keyof typeof Status

  /**
   * Open a new stream on this connection, attempt to negotiate one of the the
   * passed protocols in order.
   */
  newStream: (protocols: string | string[], options?: NewStreamOptions) => Promise<Stream>

  /**
   * Gracefully close this connection and all associated streams
   */
  close: () => Promise<void>

  /**
   * Immediately close this connection and all associated streams
   */
  abort: (err: Error) => void

  /**
   * Add a stream to this connection. Called internally by the Upgrader
   */
  addStream: (stream: Stream) => void

  /**
   * Remove a stream from this connection. Called internally by the Upgrader
   */
  removeStream: (id: string) => void
}

export const symbol = Symbol.for('@libp2p/connection')

export function isConnection (other: any): other is Connection {
  return other != null && Boolean(other[symbol])
}

export interface ConnectionProtector {

  /**
   * Takes a given Connection and creates a private encryption stream
   * between its two peers from the PSK the Protector instance was
   * created with.
   */
  protect: (connection: MultiaddrConnection) => Promise<MultiaddrConnection>
}

export interface MultiaddrConnectionTimeline {
  open: number
  upgraded?: number
  close?: number
}

/**
 * A MultiaddrConnection is returned by transports after dialing
 * a peer. It is a low-level primitive and is the raw connection
 * without encryption or stream multiplexing.
 */
export interface MultiaddrConnection extends Duplex<AsyncGenerator<Uint8Array>, Source<Uint8Array>, Promise<void>> {
  close: () => Promise<void>
  abort: (err: Error) => void
  remoteAddr: Multiaddr
  timeline: MultiaddrConnectionTimeline
}
