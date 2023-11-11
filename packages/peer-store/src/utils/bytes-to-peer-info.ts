import { peerIdFromPeerId } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { Peer as PeerPB } from '../pb/peer.js'
import type { PeerId } from '@libp2p/interface/peer-id'
import type { PeerInfo } from '@libp2p/interface/peer-info'

export function bytesToPeerInfo (peerId: PeerId, buf: Uint8Array): PeerInfo {
  const peer = PeerPB.decode(buf)

  if (peer.publicKey != null && peerId.publicKey == null) {
    peerId = peerIdFromPeerId({
      ...peerId,
      publicKey: peerId.publicKey
    })
  }

  return {
    id: peerId,
    multiaddrs: peer.addresses.map(({ multiaddr: ma }) => {
      return multiaddr(ma)
    }),
    protocols: peer.protocols
  }
}
