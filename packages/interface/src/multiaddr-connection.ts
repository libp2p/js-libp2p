import type { MessageStream, MessageStreamTimeline } from './message-stream.ts'
import type { Multiaddr } from '@multiformats/multiaddr'

export interface MultiaddrConnectionTimeline extends MessageStreamTimeline {
  /**
   * When the MultiaddrConnection was upgraded to a Connection - the type of
   * connection encryption and multiplexing was negotiated.
   */
  upgraded?: number
}

/**
 * A MultiaddrConnection is returned by a transport after dialing a peer. It is
 * a low-level primitive and is the raw connection, typically without encryption
 * or stream multiplexing.
 */
export interface MultiaddrConnection extends MessageStream<MultiaddrConnectionTimeline> {
  /**
   * The address of the remote end of the connection
   */
  remoteAddr: Multiaddr

  /**
   * When stream life cycle events occurred
   */
  timeline: MultiaddrConnectionTimeline
}
