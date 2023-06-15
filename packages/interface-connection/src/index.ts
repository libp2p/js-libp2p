import type * as Status from './status.js'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { AbortOptions } from '@libp2p/interfaces'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { Duplex, Source } from 'it-stream-types'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface ConnectionTimeline {
  open: number
  upgraded?: number
  close?: number
}

/**
 * Outbound conections are opened by the local node, inbound streams are opened by the remote
 */
export type Direction = 'inbound' | 'outbound'

export interface ConnectionStat {
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
  status: keyof typeof Status
}

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

export interface StreamStat {
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
}

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
  close: () => void

  /**
   * Closes the stream for **reading**. If iterating over the source of this stream in a `for await of` loop, it will return (exit the loop) after any buffered data has been consumed.
   *
   * This function is called automatically by the muxer when it receives a `CLOSE` message from the remote.
   *
   * The source will return normally, the sink will continue to consume.
   */
  closeRead: () => void

  /**
   * Closes the stream for **writing**. If iterating over the source of this stream in a `for await of` loop, it will return (exit the loop) after any buffered data has been consumed.
   *
   * The source will return normally, the sink will continue to consume.
   */
  closeWrite: () => void

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
   * Closes the stream *immediately* for **reading** *and* **writing**. This should be called when a *remote error* has occurred.
   *
   * This function is called automatically by the muxer when it receives a `RESET` message from the remote.
   *
   * The sink will return and the source will throw.
   */
  reset: () => void

  /**
   * Unique identifier for a stream. Identifiers are not unique across muxers.
   */
  id: string

  /**
   * Stats about this stream
   */
  stat: StreamStat

  /**
   * User defined stream metadata
   */
  metadata: Record<string, any>
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
  id: string
  stat: ConnectionStat
  remoteAddr: Multiaddr
  remotePeer: PeerId
  tags: string[]
  streams: Stream[]

  newStream: (multicodecs: string | string[], options?: NewStreamOptions) => Promise<Stream>
  addStream: (stream: Stream) => void
  removeStream: (id: string) => void
  close: () => Promise<void>
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
  close: (err?: Error) => Promise<void>
  remoteAddr: Multiaddr
  timeline: MultiaddrConnectionTimeline
}
