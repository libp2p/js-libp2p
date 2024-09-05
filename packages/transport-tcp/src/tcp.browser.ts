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

import { serviceCapabilities, transportSymbol } from '@libp2p/interface'
import type { TCPComponents, TCPDialEvents, TCPMetrics, TCPOptions } from './index.js'
import type { Logger, Connection, Transport, Listener } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'

export class TCP implements Transport<TCPDialEvents> {
  private readonly opts: TCPOptions
  private readonly metrics?: TCPMetrics
  private readonly components: TCPComponents
  private readonly log: Logger

  constructor () {
    throw new Error('TCP connections are not possible in browsers')
  }

  readonly [transportSymbol] = true

  readonly [Symbol.toStringTag] = '@libp2p/tcp'

  readonly [serviceCapabilities]: string[] = [
    '@libp2p/transport'
  ]

  async dial (): Promise<Connection> {
    throw new Error('TCP connections are not possible in browsers')
  }

  createListener (): Listener {
    throw new Error('TCP connections are not possible in browsers')
  }

  listenFilter (): Multiaddr[] {
    return []
  }

  dialFilter (): Multiaddr[] {
    return []
  }
}
