import { base64 } from 'multiformats/bases/base64'
import { toObject } from './to-object.js'
import type { Peer } from '../rpc/index.js'
import type { PeerId, PeerStore } from '@libp2p/interface'

export interface Components {
  peerId: PeerId
  peerStore: PeerStore
}

export async function getSelf (components: Components): Promise<Peer> {
  const peer = await components.peerStore.get(components.peerId)

  return {
    id: peer.id,
    addresses: peer.addresses,
    protocols: [...peer.protocols],
    tags: toObject(peer.tags, (t) => t.value),
    metadata: toObject(peer.metadata, (buf) => base64.encode(buf))
  }
}
