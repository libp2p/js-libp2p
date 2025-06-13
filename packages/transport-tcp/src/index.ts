/**
 * @packageDocumentation
 *
 * A [libp2p transport](https://docs.libp2p.io/concepts/transports/overview/) based on the TCP networking stack.
 *
 * @example
 *
 * ```TypeScript
 * import { createLibp2p } from 'libp2p'
 * import { tcp } from '@libp2p/tcp'
 * import { multiaddr } from '@multiformats/multiaddr'
 *
 * const node = await createLibp2p({
 *   transports: [
 *     tcp()
 *   ]
 * })
 *
 * const ma = multiaddr('/ip4/123.123.123.123/tcp/1234')
 *
 * // dial a TCP connection, timing out after 10 seconds
 * const connection = await node.dial(ma, {
 *   signal: AbortSignal.timeout(10_000)
 * })
 *
 * // use connection...
 * ```
 */

import { TCP } from './tcp.js'
import type { ComponentLogger, CounterGroup, Metrics, CreateListenerOptions, DialTransportOptions, Transport, OutboundConnectionUpgradeEvents } from '@libp2p/interface'
import type { ProgressEvent } from 'progress-events'

export interface CloseServerOnMaxConnectionsOpts {
  /**
   * Server listens once connection count is less than `listenBelow`
   */
  listenBelow: number

  /**
   * Close server once connection count is greater than or equal to `closeAbove`
   */
  closeAbove: number

  /**
   * Invoked when there was an error listening on a socket
   */
  onListenError?(err: Error): void
}

export interface TCPOptions {
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
   * Close server (stop listening for new connections) if connections exceed a limit.
   * Open server (start listening for new connections) if connections fall below a limit.
   */
  closeServerOnMaxConnections?: CloseServerOnMaxConnectionsOpts

  /**
   * Options passed to `net.connect` for every opened TCP socket
   */
  dialOpts?: TCPSocketOptions

  /**
   * Options passed to every `net.createServer` for every TCP server
   */
  listenOpts?: TCPSocketOptions
}

/**
 * Expose a subset of net.connect options
 */
export interface TCPSocketOptions {
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

export type TCPDialEvents =
  OutboundConnectionUpgradeEvents |
  ProgressEvent<'tcp:open-connection'>

export interface TCPDialOptions extends DialTransportOptions<TCPDialEvents>, TCPSocketOptions {

}

export interface TCPCreateListenerOptions extends CreateListenerOptions, TCPSocketOptions {

}

export interface TCPComponents {
  metrics?: Metrics
  logger: ComponentLogger
}

export interface TCPMetrics {
  events: CounterGroup<'error' | 'timeout' | 'connect' | 'abort'>
  errors: CounterGroup<'outbound_to_connection' | 'outbound_upgrade'>
}

export function tcp (init: TCPOptions = {}): (components: TCPComponents) => Transport {
  return (components: TCPComponents) => {
    return new TCP(components, init)
  }
}
