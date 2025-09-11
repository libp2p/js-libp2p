import type { AbortOptions, Logger, TypedEventTarget, Stream, MessageStreamEvents, PeerId, MultiaddrConnectionTimeline, MessageStreamStatus, MessageStreamDirection } from './index.js'
import type { Multiaddr } from '@multiformats/multiaddr'

export type ConnectionStatus = MessageStreamStatus

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

export interface NewStreamOptions extends AbortOptions {
  /**
   * If specified, and no handler has been registered with the registrar for the
   * successfully negotiated protocol, use this as the max outbound stream limit
   * for the protocol
   */
  maxOutboundStreams?: number

  /**
   * Opt-in to running over a limited connection - one that has restrictions
   * on the amount of data that may be transferred or how long it may be open
   * for.
   *
   * These limits are typically enforced by a relay server, if the protocol will
   * be transferring a lot of data or the stream will be open for a long time
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

/**
 * A Connection is a high-level representation of a connection
 * to a remote peer that may have been secured by encryption and
 * multiplexed, depending on the configuration of the nodes
 * between which the connection is made.
 */
export interface Connection extends TypedEventTarget<Omit<MessageStreamEvents, 'drain' | 'message'>> {
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
   * A list of open streams on this connection
   */
  streams: Stream[]

  /**
   * Outbound connections are opened by the local node, inbound streams are opened by the remote
   */
  direction: MessageStreamDirection

  /**
   * When stream life cycle events occurred
   */
  timeline: MultiaddrConnectionTimeline

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
   * Whether this connection is direct or, for example, is via a relay
   */
  direct: boolean

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
   * The connection logger, used to log connection-specific information
   */
  log: Logger

  /**
   * Create a new stream on this connection and negotiate one of the passed protocols
   */
  newStream(protocols: string | string[], options?: NewStreamOptions): Promise<Stream>

  /**
   * Gracefully close the connection. The returned promise will resolve when all
   * queued data has been written to the underlying transport. Any unread data
   * will still be emitted as a 'message' event.
   */
  close(options?: AbortOptions): Promise<void>

  /**
   * Immediately close the connection. Any data queued to be sent or read will
   * be discarded.
   */
  abort(err: Error): void
}

export const connectionSymbol = Symbol.for('@libp2p/connection')

export function isConnection (other: any): other is Connection {
  return other != null && Boolean(other[connectionSymbol])
}
