import Sinon from 'sinon'
import type { PeerId } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'

/**
 * @deprecated PeerIds can be passed to sinon matchers directly
 */
export function matchPeerId (peerId: PeerId): Sinon.SinonMatcher {
  return Sinon.match(p => p.toString() === peerId.toString())
}

/**
 * @deprecated Multiaddrs can be passed to sinon matchers directly
 */
export function matchMultiaddr (ma: Multiaddr): Sinon.SinonMatcher {
  return Sinon.match(m => m.toString() === ma.toString())
}
