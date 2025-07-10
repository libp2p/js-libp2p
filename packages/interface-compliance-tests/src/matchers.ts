import Sinon from 'sinon'
import type { PeerId } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { SinonMatcher } from 'sinon'

/**
 * @deprecated PeerIds can be passed to sinon matchers directly
 */
export function matchPeerId (peerId: PeerId): SinonMatcher {
  return Sinon.match(p => p.toString() === peerId.toString())
}

/**
 * @deprecated Multiaddrs can be passed to sinon matchers directly
 */
export function matchMultiaddr (ma: Multiaddr): SinonMatcher {
  return Sinon.match(m => m.toString() === ma.toString())
}
