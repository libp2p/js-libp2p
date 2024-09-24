import type { AbortOptions, Logger } from '../index.js'
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
  close(options?: AbortOptions): Promise<void>

  /**
   * Closes the stream for **reading**. If iterating over the source of this stream in a `for await of` loop, it will return (exit the loop) after any buffered data has been consumed.
   *
   * This function is called automatically by the muxer when it receives a `CLOSE` message from the remote.
   *
   * The source will return normally, the sink will continue to consume.
   */
  closeRead(options?: AbortOptions): Promise<void>

  /**
   * Closes the stream for **writing**. If iterating over the source of this stream in a `for await of` loop, it will return (exit the loop) after any buffered data has been consumed.
   *
   * The source will return normally, the sink will continue to consume.
   */
  closeWrite(options?: AbortOptions): Promise<void>

  /**
   * Closes the stream for **reading** *and* **writing**. This should be called when a *local error* has occurred.
   *
   * Note, if called without an error any buffered data in the source can still be consumed and the stream will end normally.
   *
   * This will cause a `RESET` message to be sent to the remote, *unless* the sink has already ended.
   *
   * The sink will return and the source will throw.
   */
  abort(err: Error): void

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
   * The protocol negotiated for this stream
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

  /**
   * The stream logger
   */
  log: Logger
}

export interface NewStreamOptions extends AbortOptions {
  /**
   * If specified, and no handler has been registered with the registrar for the
   * successfully negotiated protocol, use this as the max outbound stream limit
   * for the protocol
   */
  maxOutboundStreams?: number

  /**
   * Opt-in to running over a limited connection - one that has restrictions
   * on the amount of data that may be transferred or how long it may be open for.
   *
   * These limits are typically enforced by a relay server, if the protocol
   * will be transferring a lot of data or the stream will be open for a long time
   * consider upgrading to a direct connection before opening the stream.
   *
   * @default false
   */
  runOnLimitedConnection?: boolean

  /**
   * By default when negotiating a protocol the dialer writes then protocol name
   * then reads the response.
   *
   * When a only a single protocol is being negotiated on an outbound stream,
   * and the stream is written to before being read from, we can optimistically
   * write the protocol name and the first chunk of data together in the first
   * message.
   *
   * Reading and handling the protocol response is done asynchronously, which
   * means we can skip a round trip on writing to newly opened streams which
   * significantly reduces the time-to-first-byte on a stream.
   *
   * The side-effect of this is that the underlying stream won't negotiate the
   * protocol until either data is written to or read from the stream so it will
   * not be opened on the remote until this is done.
   *
   * Pass `false` here to optimistically write the protocol name and first chunk
   * of data in the first message.
   *
   * If multiple protocols are being negotiated, negotiation is always completed
   * in full before the stream is returned so this option has no effect.
   *
   * @default true
   */
  negotiateFully?: boolean
}

export type ConnectionStatus = 'open' | 'closing' | 'closed'

/**
 * Connection limits are present on connections that are only allowed to
 * transfer a certain amount of bytes or be open for a certain number
 * of seconds.
 *
 * These limits are applied by Circuit Relay v2 servers, for example and
 * the connection will normally be closed abruptly if the limits are
 * exceeded.
 */
export interface ConnectionLimits {
  /**
   * If present this is the number of bytes remaining that may be
   * transferred over this connection
   */
  bytes?: bigint

  /**
   * If present this is the number of seconds that this connection will
   * remain open for
   */
  seconds?: number
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
   * The multiplexer negotiated for this connection
   */
  multiplexer?: string

  /**
   * The encryption protocol negotiated for this connection
   */
  encryption?: string

  /**
   * The current status of the connection
   */
  status: ConnectionStatus

  /**
   * If present, this connection has limits applied to it, perhaps by an
   * intermediate relay. Once the limits have been reached the connection will
   * be closed by the relay.
   */
  limits?: ConnectionLimits

  /**
   * The time in milliseconds it takes to make a round trip to the remote peer.
   *
   * This is updated periodically by the connection monitor.
   */
  rtt?: number

  /**
   * Create a new stream on this connection and negotiate one of the passed protocols
   */
  newStream(protocols: string | string[], options?: NewStreamOptions): Promise<Stream>

  /**
   * Gracefully close the connection. All queued data will be written to the
   * underlying transport.
   */
  close(options?: AbortOptions): Promise<void>

  /**
   * Immediately close the connection, any queued data will be discarded
   */
  abort(err: Error): void

  /**
   * The connection logger
   */
  log: Logger
}

export const connectionSymbol = Symbol.for('@libp2p/connection')

export function isConnection (other: any): other is Connection {
  return other != null && Boolean(other[connectionSymbol])
}

export interface ConnectionProtector {
  /**
   * Takes a given Connection and creates a private encryption stream
   * between its two peers from the PSK the Protector instance was
   * created with.
   */
  protect(connection: MultiaddrConnection, options?: AbortOptions): Promise<MultiaddrConnection>
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
export interface MultiaddrConnection extends Duplex<AsyncGenerator<Uint8Array | Uint8ArrayList>> {
  /**
   * Gracefully close the connection. All queued data will be written to the
   * underlying transport.
   */
  close(options?: AbortOptions): Promise<void>

  /**
   * Immediately close the connection, any queued data will be discarded
   */
  abort(err: Error): void

  /**
   * The address of the remote end of the connection
   */
  remoteAddr: Multiaddr

  /**
   * When connection lifecycle events occurred
   */
  timeline: MultiaddrConnectionTimeline

  /**
   * The multiaddr connection logger
   */
  log: Logger
}
