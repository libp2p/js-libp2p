import type { AbortOptions } from '../index.js'
import type { PeerId } from '../peer-id/index.js'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { Duplex, Source } from 'it-stream-types'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface ConnectionTimeline {
  /**
   * When the connection was opened
   */
  open: number

  /**
   * When the MultiaddrConnection was upgraded to a Connection - e.g. the type
   * of connection encryption and multiplexing was negotiated.
   */
  upgraded?: number

  /**
   * When the connection was closed.
   */
  close?: number
}

/**
 * Outbound connections are opened by the local node, inbound streams are opened by the remote
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

  /**
   * A timestamp of when the stream was aborted
   */
  abort?: number
}

/**
 * The states a stream can be in
 */
export type StreamStatus = 'open' | 'closing' | 'closed' | 'aborted' | 'reset'

/**
 * The states the readable end of a stream can be in
 *
 * ready - the readable end is ready for reading
 * closing - the readable end is closing
 * closed - the readable end has closed
 */
export type ReadStatus = 'ready' | 'closing' | 'closed'

/**
 * The states the writable end of a stream can be in
 *
 * ready - the writable end is ready for writing
 * writing - the writable end is in the process of being written to
 * done - the source passed to the `.sink` function yielded all values without error
 * closing - the writable end is closing
 * closed - the writable end has closed
 */
export type WriteStatus = 'ready' | 'writing' | 'done' | 'closing' | 'closed'

/**
 * A Stream is a data channel between two peers that
 * can be written to and read from at both ends.
 *
 * It may be encrypted and multiplexed depending on the
 * configuration of the nodes.
 */
export interface Stream extends Duplex<AsyncGenerator<Uint8ArrayList>, Source<Uint8ArrayList | Uint8Array>, Promise<void>> {
  /**
   * Closes the stream for **reading** *and* **writing**.
   *
   * Any buffered data in the source can still be consumed and the stream will end normally.
   *
   * This will cause a `CLOSE` message to be sent to the remote, *unless* the sink has already ended.
   *
   * The sink and the source will return normally.
   */
  close: (options?: AbortOptions) => Promise<void>

  /**
   * Closes the stream for **reading**. If iterating over the source of this stream in a `for await of` loop, it will return (exit the loop) after any buffered data has been consumed.
   *
   * This function is called automatically by the muxer when it receives a `CLOSE` message from the remote.
   *
   * The source will return normally, the sink will continue to consume.
   */
  closeRead: (options?: AbortOptions) => Promise<void>

  /**
   * Closes the stream for **writing**. If iterating over the source of this stream in a `for await of` loop, it will return (exit the loop) after any buffered data has been consumed.
   *
   * The source will return normally, the sink will continue to consume.
   */
  closeWrite: (options?: AbortOptions) => Promise<void>

  /**
   * Closes the stream for **reading** *and* **writing**. This should be called when a *local error* has occurred.
   *
   * Note, if called without an error any buffered data in the source can still be consumed and the stream will end normally.
   *
   * This will cause a `RESET` message to be sent to the remote, *unless* the sink has already ended.
   *
   * The sink will return and the source will throw if an error is passed or return normally if not.
   */
  abort: (err: Error) => void

  /**
   * Unique identifier for a stream. Identifiers are not unique across muxers.
   */
  id: string

  /**
   * Outbound streams are opened by the local node, inbound streams are opened by the remote
   */
  direction: Direction

  /**
   * Lifecycle times for the stream
   */
  timeline: StreamTimeline

  /**
   * Once a protocol has been negotiated for this stream, it will be set on the stat object
   */
  protocol?: string

  /**
   * User defined stream metadata
   */
  metadata: Record<string, any>

  /**
   * The current status of the stream
   */
  status: StreamStatus

  /**
   * The current status of the readable end of the stream
   */
  readStatus: ReadStatus

  /**
   * The current status of the writable end of the stream
   */
  writeStatus: WriteStatus
}

export interface NewStreamOptions extends AbortOptions {
  /**
   * If specified, and no handler has been registered with the registrar for the
   * successfully negotiated protocol, use this as the max outbound stream limit
   * for the protocol
   */
  maxOutboundStreams?: number

  /**
   * Opt-in to running over a transient connection - one that has time/data limits
   * placed on it.
   */
  runOnTransientConnection?: boolean
}

export type ConnectionStatus = 'open' | 'closing' | 'closed'

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
   * The address of the remote end of the connection
   */
  remoteAddr: Multiaddr

  /**
   * The id of the peer at the remote end of the connection
   */
  remotePeer: PeerId

  /**
   * A list of tags applied to this connection
   */
  tags: string[]

  /**
   * A list of open streams on this connection
   */
  streams: Stream[]

  /**
   * Outbound conections are opened by the local node, inbound streams are opened by the remote
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
  status: ConnectionStatus

  /**
   * A transient connection is one that is not expected to be open for very long
   * or one that cannot transfer very much data, such as one being used as a
   * circuit relay connection. Protocols need to explicitly opt-in to being run
   * over transient connections.
   */
  transient: boolean

  /**
   * Create a new stream on this connection and negotiate one of the passed protocols
   */
  newStream: (protocols: string | string[], options?: NewStreamOptions) => Promise<Stream>

  /**
   * Gracefully close the connection. All queued data will be written to the
   * underlying transport.
   */
  close: (options?: AbortOptions) => Promise<void>

  /**
   * Immediately close the connection, any queued data will be discarded
   */
  abort: (err: Error) => void
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
  /**
   * When the connection was opened
   */
  open: number

  /**
   * When the MultiaddrConnection was upgraded to a Connection - the type of
   * connection encryption and multiplexing was negotiated.
   */
  upgraded?: number

  /**
   * When the connection was closed.
   */
  close?: number
}

/**
 * A MultiaddrConnection is returned by transports after dialing
 * a peer. It is a low-level primitive and is the raw connection
 * without encryption or stream multiplexing.
 */
export interface MultiaddrConnection extends Duplex<AsyncGenerator<Uint8Array>, Source<Uint8Array>, Promise<void>> {
  /**
   * Gracefully close the connection. All queued data will be written to the
   * underlying transport.
   */
  close: (options?: AbortOptions) => Promise<void>

  /**
   * Immediately close the connection, any queued data will be discarded
   */
  abort: (err: Error) => void

  /**
   * The address of the remote end of the connection
   */
  remoteAddr: Multiaddr

  /**
   * When connection lifecycle events occurred
   */
  timeline: MultiaddrConnectionTimeline
}
