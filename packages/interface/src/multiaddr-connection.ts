import type { MessageStream, MessageStreamTimeline } from './message-stream.ts'
import type { Multiaddr } from '@multiformats/multiaddr'

export type MultiaddrConnectionDirection = 'inbound' | 'outbound'

export interface MultiaddrConnectionTimeline extends MessageStreamTimeline {
  /**
   * When the MultiaddrConnection was upgraded to a Connection - the type of
   * connection encryption and multiplexing was negotiated.
   */
  upgraded?: number
}

/**
 * A MultiaddrConnection is returned by transports after dialing a peer. It is a
 * low-level primitive and is the raw connection without encryption or stream
 * multiplexing.
 */
export interface MultiaddrConnection extends MessageStream {
  /**
   * The address of the remote end of the connection
   */
  remoteAddr: Multiaddr

  /**
   * When stream life cycle events occurred
   */
  timeline: MultiaddrConnectionTimeline

  /**
   * Whether this connection is inbound or outbound
   */
  direction: MultiaddrConnectionDirection
}
