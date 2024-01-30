import Sinon from 'sinon'
import type { PeerId } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'

export function matchPeerId (peerId: PeerId): Sinon.SinonMatcher {
  return Sinon.match(p => p.toString() === peerId.toString())
}

export function matchMultiaddr (ma: Multiaddr): Sinon.SinonMatcher {
  return Sinon.match(m => m.toString() === ma.toString())
}
