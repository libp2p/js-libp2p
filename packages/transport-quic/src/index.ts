/**
 * @packageDocumentation
 *
 * A [libp2p transport](https://docs.libp2p.io/concepts/transports/overview/) based on the QUIC networking stack.
 *
 * @example
 *
 * ```TypeScript
 * import { createLibp2p } from 'libp2p'
 * import { quic } from '@libp2p/quic'
 * import { multiaddr } from '@multiformats/multiaddr'
 *
 * const node = await createLibp2p({
 *   transports: [
 *     quic()
 *   ]
 * })
 *
 * const ma = multiaddr('/ip4/123.123.123.123/udp/1234/quic-v1')
 *
 * // dial a QUIC connection, timing out after 10 seconds
 * const connection = await node.dial(ma, {
 *   signal: AbortSignal.timeout(10_000)
 * })
 *
 * // use connection...
 * ```
 */

import { QUIC } from './quic.ts'
import type { ComponentLogger, CounterGroup, Metrics, CreateListenerOptions, DialTransportOptions, Transport, OutboundConnectionUpgradeEvents, PrivateKey } from '@libp2p/interface'
import type { ProgressEvent } from 'progress-events'

export interface QUICOptions {
  /**
   * An optional number in ms that is used as an inactivity timeout after which the socket will be closed
   */
  inboundSocketInactivityTimeout?: number

  /**
   * An optional number in ms that is used as an inactivity timeout after which the socket will be closed
   */
  outboundSocketInactivityTimeout?: number

  /**
   * When closing a socket, wait this long for it to close gracefully before it is closed more forcibly
   */
  socketCloseTimeout?: number

  /**
   * Set this property to reject connections when the server's connection count gets high.
   * https://nodejs.org/api/net.html#servermaxconnections
   */
  maxConnections?: number

  /**
   * Parameter to specify the maximum length of the queue of pending connections
   * https://nodejs.org/dist/latest-v18.x/docs/api/net.html#serverlisten
   */
  backlog?: number

  /**
   * Options passed to `net.connect` for every opened TCP socket
   */
  dialOpts?: QUICSocketOptions

  /**
   * Options passed to every `net.createServer` for every TCP server
   */
  listenOpts?: QUICSocketOptions

  /**
   * How many concurrent streams are allowed on outbound connections
   */
  maxOutboundStreams?: number
}

/**
 * Expose a subset of net.connect options
 */
export interface QUICSocketOptions {
  /**
   * @see https://nodejs.org/api/net.html#socketconnectoptions-connectlistener
   */
  noDelay?: boolean

  /**
   * @see https://nodejs.org/api/net.html#socketconnectoptions-connectlistener
   */
  keepAlive?: boolean

  /**
   * @see https://nodejs.org/api/net.html#socketconnectoptions-connectlistener
   */
  keepAliveInitialDelay?: number

  /**
   * @see https://nodejs.org/api/net.html#new-netsocketoptions
   */
  allowHalfOpen?: boolean
}

export type QUICDialEvents =
  OutboundConnectionUpgradeEvents |
  ProgressEvent<'quic:open-connection'>

export interface QUICDialOptions extends DialTransportOptions<QUICDialEvents>, QUICSocketOptions {

}

export interface QUICCreateListenerOptions extends CreateListenerOptions, QUICSocketOptions {

}

export interface QUICComponents {
  privateKey: PrivateKey
  metrics?: Metrics
  logger: ComponentLogger
}

export interface QUICMetrics {
  events: CounterGroup<'error' | 'timeout' | 'connect' | 'abort'>
  errors: CounterGroup<'outbound_verify_peer' | 'outbound_to_connection' | 'outbound_upgrade'>
}

export function quic (init: QUICOptions = {}): (components: QUICComponents) => Transport {
  return (components: QUICComponents) => {
    return new QUIC(components, init)
  }
}
