import { peerIdFromPeerId } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { Peer as PeerPB } from '../pb/peer.js'
import type { PeerId } from '@libp2p/interface/peer-id'
import type { Peer, Tag } from '@libp2p/interface/peer-store'

export function bytesToPeer (peerId: PeerId, buf: Uint8Array): Peer {
  const peer = PeerPB.decode(buf)

  if (peer.publicKey != null && peerId.publicKey == null) {
    peerId = peerIdFromPeerId({
      ...peerId,
      publicKey: peerId.publicKey
    })
  }

  const tags = new Map<string, Tag>()

  // remove any expired tags
  const now = BigInt(Date.now())

  for (const [key, tag] of peer.tags.entries()) {
    if (tag.expiry != null && tag.expiry < now) {
      continue
    }

    tags.set(key, tag)
  }

  return {
    ...peer,
    id: peerId,
    addresses: peer.addresses.map(({ multiaddr: ma, isCertified }) => {
      return {
        multiaddr: multiaddr(ma),
        isCertified: isCertified ?? false
      }
    }),
    metadata: peer.metadata,
    peerRecordEnvelope: peer.peerRecordEnvelope ?? undefined,
    tags
  }
}
