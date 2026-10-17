import { peerIdFromMultihash } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { Peer as PeerPB } from '../pb/peer.ts'
import type { PeerId, Peer, Tag } from '@libp2p/interface'

function populatePublicKey (peerId: PeerId, protobuf: PeerPB): PeerId {
  if (peerId.publicKey != null || protobuf.publicKey == null) {
    return peerId
  }

  return peerIdFromMultihash(peerId.toMultihash(), protobuf.publicKey)
}

export function bytesToPeer (peerId: PeerId, buf: Uint8Array, maxAddressAge: number): Peer {
  const peer = PeerPB.decode(buf)

  return pbToPeer(peerId, peer, maxAddressAge)
}

export function pbToPeer (peerId: PeerId, peer: PeerPB, maxAddressAge: number): Peer {
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
    id: populatePublicKey(peerId, peer),
    addresses: peer.addresses
      // remove any expired multiaddrs
      .filter(({ observed }) => observed != null && observed > (Date.now() - maxAddressAge))
      .map(({ multiaddr: ma, isCertified }) => {
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
