import { publicKeyFromProtobuf } from '@libp2p/crypto/keys'
import { peerIdFromPublicKey } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { Peer as PeerPB } from '../pb/peer.js'
import type { PeerId, Peer, Tag } from '@libp2p/interface'
import type { Digest } from 'multiformats/hashes/digest'

function populatePublicKey (peerId: PeerId, protobuf: PeerPB): PeerId {
  if (peerId.publicKey != null || protobuf.publicKey == null) {
    return peerId
  }

  let digest: Digest<18, number> | undefined

  if (peerId.type === 'RSA') {
    // avoid hashing public key
    digest = peerId.toMultihash()
  }

  const publicKey = publicKeyFromProtobuf(protobuf.publicKey, digest)
  return peerIdFromPublicKey(publicKey)
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
