import { peerIdFromBytes } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import type { PeerInfo as PBPeerInfo, ConnectionType } from './dht.js'
import type { PeerInfo } from '@libp2p/interface'

export function toPbPeerInfo (peer: PeerInfo, connection?: ConnectionType): PBPeerInfo {
  const output: PBPeerInfo = {
    id: peer.id.toBytes(),
    multiaddrs: (peer.multiaddrs ?? []).map((m) => m.bytes),
    connection
  }

  return output
}

export function fromPbPeerInfo (peer: PBPeerInfo): PeerInfo {
  if (peer.id == null) {
    throw new Error('Invalid peer in message')
  }

  return {
    id: peerIdFromBytes(peer.id),
    multiaddrs: (peer.multiaddrs ?? []).map((a) => multiaddr(a))
  }
}
