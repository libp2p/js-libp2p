import Sinon from 'sinon'
import type { PeerId } from '@libp2p/interface-peer-id'

export function matchPeerId (peerId: PeerId): Sinon.SinonMatcher {
  return Sinon.match(p => p.toString() === peerId.toString())
}
