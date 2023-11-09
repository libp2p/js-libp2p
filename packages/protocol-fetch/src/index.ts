/**
 * @packageDocumentation
 *
 * An implementation of the Fetch protocol as described here: https://github.com/libp2p/specs/tree/master/fetch
 *
 * The fetch protocol is a simple protocol for requesting a value corresponding to a key from a peer.
 *
 * @example
 *
 * ```typescript
 * import { createLibp2p } from 'libp2p'
 * import { fetch } from '@libp2p/fetch'
 *
 * const libp2p = await createLibp2p({
 *   services: {
 *     fetch: fetch()
 *   }
 * })
 *
 * // Given a key (as a string) returns a value (as a Uint8Array), or null if the key isn't found.
 * // All keys must be prefixed my the same prefix, which will be used to find the appropriate key
 * // lookup function.
 * async function my_subsystem_key_lookup(key) {
 *   // app specific callback to lookup key-value pairs.
 * }
 *
 * // Enable this peer to respond to fetch requests for keys that begin with '/my_subsystem_key_prefix/'
 * libp2p.fetch.registerLookupFunction('/my_subsystem_key_prefix/', my_subsystem_key_lookup)
 *
 * const key = '/my_subsystem_key_prefix/{...}'
 * const peerDst = PeerId.parse('Qmfoo...') // or Multiaddr instance
 * const value = await libp2p.fetch(peerDst, key)
 * ```
 */

import { Fetch as FetchClass } from './fetch.js'
import type { AbortOptions, ComponentLogger } from '@libp2p/interface'
import type { PeerId } from '@libp2p/interface/peer-id'
import type { ConnectionManager } from '@libp2p/interface-internal/connection-manager'
import type { Registrar } from '@libp2p/interface-internal/registrar'

export interface FetchInit {
  protocolPrefix?: string
  maxInboundStreams?: number
  maxOutboundStreams?: number

  /**
   * How long we should wait for a remote peer to send any data
   */
  timeout?: number
}

export interface LookupFunction {
  (key: string): Promise<Uint8Array | undefined>
}

export interface FetchComponents {
  registrar: Registrar
  connectionManager: ConnectionManager
  logger: ComponentLogger
}

export interface Fetch {
  /**
   * Sends a request to fetch the value associated with the given key from the given peer
   */
  fetch(peer: PeerId, key: string, options?: AbortOptions): Promise<Uint8Array | undefined>

  /**
   * Registers a new lookup callback that can map keys to values, for a given set of keys that
   * share the same prefix
   *
   * @example
   *
   * ```js
   * // ...
   * libp2p.fetchService.registerLookupFunction('/prefix', (key) => { ... })
   * ```
   */
  registerLookupFunction(prefix: string, lookup: LookupFunction): void

  /**
   * Registers a new lookup callback that can map keys to values, for a given set of keys that
   * share the same prefix.
   *
   * @example
   *
   * ```js
   * // ...
   * libp2p.fetchService.unregisterLookupFunction('/prefix')
   * ```
   */
  unregisterLookupFunction(prefix: string, lookup?: LookupFunction): void
}

export function fetch (init: FetchInit = {}): (components: FetchComponents) => Fetch {
  return (components) => new FetchClass(components, init)
}
