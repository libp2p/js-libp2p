/**
 * @packageDocumentation
 *
 * An implementation of a simple Echo protocol.
 *
 * Any data received by the receiver will be sent back to the sender.
 *
 * @example
 *
 * ```TypeScript
 * import { noise } from '@chainsafe/libp2p-noise'
 * import { yamux } from '@chainsafe/libp2p-yamux'
 * import { echo } from '@libp2p/echo'
 * import { peerIdFromString } from '@libp2p/peer-id'
 * import { createLibp2p } from 'libp2p'
 *
 * const receiver = await createLibp2p({
 *   addresses: {
 *     listen: ['/ip4/0.0.0.0/tcp/0']
 *   },
 *   connectionEncrypters: [noise()],
 *   streamMuxers: [yamux()],
 *   services: {
 *     echo: echo()
 *   }
 * })
 *
 * const sender = await createLibp2p({
 *   addresses: {
 *     listen: ['/ip4/0.0.0.0/tcp/0']
 *   },
 *   connectionEncrypters: [noise()],
 *   streamMuxers: [yamux()],
 *   services: {
 *     echo: echo()
 *   }
 * })
 *
 * const stream = await sender.dialProtocol(receiver.getMultiaddrs(), sender.services.echo.protocol)
 *
 * // write/read stream
 * ```
 */

import { Echo as EchoClass } from './echo.js'
import type { AbortOptions, PeerId } from '@libp2p/interface'
import type { ConnectionManager, Registrar } from '@libp2p/interface-internal'
import type { Multiaddr } from '@multiformats/multiaddr'

export interface EchoInit {
  protocolPrefix?: string
  maxInboundStreams?: number
  maxOutboundStreams?: number
  runOnLimitedConnection?: boolean
  timeout?: number
}

export interface EchoComponents {
  registrar: Registrar
  connectionManager: ConnectionManager
}

export interface Echo {
  protocol: string
  echo(peer: PeerId | Multiaddr | Multiaddr[], buf: Uint8Array, options?: AbortOptions): Promise<Uint8Array>
}

export function echo (init: EchoInit = {}): (components: EchoComponents) => Echo {
  return (components) => new EchoClass(components, init)
}
