/**
 * @packageDocumentation
 *
 * A [libp2p transport](https://docs.libp2p.io/concepts/transports/overview/)
 * that operates in-memory only.
 *
 * This is intended for testing and can only be used to connect two libp2p nodes
 * that are running in the same process.
 *
 * @example
 *
 * ```TypeScript
 * import { createLibp2p } from 'libp2p'
 * import { memory } from '@libp2p/memory'
 * import { multiaddr } from '@multiformats/multiaddr'
 *
 * const listener = await createLibp2p({
 *   addresses: {
 *     listen: [
 *       '/memory/address-a'
 *     ]
 *   },
 *   transports: [
 *     memory()
 *   ]
 * })
 *
 * const dialer = await createLibp2p({
 *   transports: [
 *     memory()
 *   ]
 * })
 *
 * const ma = multiaddr('/memory/address-a')
 *
 * // dial the listener, timing out after 10s
 * const connection = await dialer.dial(ma, {
 *   signal: AbortSignal.timeout(10_000)
 * })
 *
 * // use connection...
 * ```
 */

import { MemoryTransport } from './memory.js'
import type { Transport, ComponentLogger, UpgraderOptions, PeerId } from '@libp2p/interface'

export interface MemoryTransportComponents {
  peerId: PeerId
  logger: ComponentLogger
}

export interface MemoryTransportInit {
  upgraderOptions?: UpgraderOptions
  inboundUpgradeTimeout?: number

  /**
   * Add this much latency in ms to every buffer sent over the transport
   *
   * @default 0
   */
  latency?: number
}

export function memory (init?: MemoryTransportInit): (components: MemoryTransportComponents) => Transport {
  return (components) => {
    return new MemoryTransport(components, init)
  }
}
