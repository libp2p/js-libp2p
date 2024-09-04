import { peerIdFromMultihash } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import * as Digest from 'multiformats/hashes/digest'
import type { PeerInfo as PBPeerInfo, ConnectionType } from './dht.js'
import type { PeerInfo } from '@libp2p/interface'

export function toPbPeerInfo (peer: PeerInfo, connection?: ConnectionType): PBPeerInfo {
  const output: PBPeerInfo = {
    id: peer.id.toMultihash().bytes,
    multiaddrs: (peer.multiaddrs ?? []).map((m) => m.bytes),
    connection
  }

  return output
}

export function fromPbPeerInfo (peer: PBPeerInfo): PeerInfo {
  if (peer.id == null) {
    throw new Error('Invalid peer in message')
  }

  const multihash = Digest.decode(peer.id)

  return {
    id: peerIdFromMultihash(multihash),
    multiaddrs: (peer.multiaddrs ?? []).map((a) => multiaddr(a))
  }
}
