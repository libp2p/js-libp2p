import { multiaddr } from '@multiformats/multiaddr'
import { Peer as PeerPB } from '../pb/peer.js'
import type { Peer, Tag } from '@libp2p/interface-peer-store'
import { createFromPubKey } from '@libp2p/peer-id-factory'
import { unmarshalPublicKey } from '@libp2p/crypto/keys'
import type { PeerId } from '@libp2p/interface-peer-id'

export async function bytesToPeer (peerId: PeerId, buf: Uint8Array): Promise<Peer> {
  const peer = PeerPB.decode(buf)

  if (peer.publicKey != null && peerId.publicKey == null) {
    peerId = await createFromPubKey(unmarshalPublicKey(peer.publicKey))
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
