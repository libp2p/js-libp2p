import type { TypedEventTarget } from '../event-target.js'
import type { PeerInfo } from '../peer-info/index.js'

/**
 * Any object that implements this Symbol as a property should return a
 * PeerDiscovery instance as the property value, similar to how
 * `Symbol.Iterable` can be used to return an `Iterable` from an `Iterator`.
 *
 * @example
 *
 * ```TypeScript
 * import { peerDiscovery, PeerDiscovery } from '@libp2p/peer-discovery'
 *
 * class MyPeerDiscoverer implements PeerDiscovery {
 *   get [peerDiscovery] () {
 *     return this
 *   }
 *
 *   // ...other methods
 * }
 * ```
 */
export const peerDiscoverySymbol = Symbol.for('@libp2p/peer-discovery')

/**
 * Implementers of this interface can provide a PeerDiscovery implementation to
 * interested callers.
 */
export interface PeerDiscoveryProvider {
  [peerDiscoverySymbol]: PeerDiscovery
}

export interface PeerDiscoveryEvents {
  'peer': CustomEvent<PeerInfo>
}

export interface PeerDiscovery extends TypedEventTarget<PeerDiscoveryEvents> {}
