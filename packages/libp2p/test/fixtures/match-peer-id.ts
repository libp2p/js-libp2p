import Sinon from 'sinon'
import type { PeerId } from '@libp2p/interface'

export function matchPeerId (peerId: PeerId): Sinon.SinonMatcher {
  return Sinon.match(p => p.toString() === peerId.toString())
}
