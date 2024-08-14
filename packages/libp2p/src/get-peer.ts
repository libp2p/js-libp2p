import { InvalidMultiaddrError, InvalidParametersError, isPeerId } from '@libp2p/interface'
import { peerIdFromString } from '@libp2p/peer-id'
import { isMultiaddr } from '@multiformats/multiaddr'
import type { PeerId } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'

export interface PeerAddress {
  peerId?: PeerId
  multiaddrs: Multiaddr[]
}

/**
 * Extracts a PeerId and/or multiaddr from the passed PeerId or Multiaddr or an array of Multiaddrs
 */
export function getPeerAddress (peer: PeerId | Multiaddr | Multiaddr[]): PeerAddress {
  if (isPeerId(peer)) {
    return { peerId: peer, multiaddrs: [] }
  }

  if (!Array.isArray(peer)) {
    peer = [peer]
  }

  let peerId: PeerId | undefined

  if (peer.length > 0) {
    const peerIdStr = peer[0].getPeerId()
    peerId = peerIdStr == null ? undefined : peerIdFromString(peerIdStr)

    // ensure PeerId is either not set or is consistent
    peer.forEach(ma => {
      if (!isMultiaddr(ma)) {
        throw new InvalidMultiaddrError('Invalid multiaddr')
      }

      const maPeerIdStr = ma.getPeerId()

      if (maPeerIdStr == null) {
        if (peerId != null) {
          throw new InvalidParametersError('Multiaddrs must all have the same peer id or have no peer id')
        }
      } else {
        const maPeerId = peerIdFromString(maPeerIdStr)

        if (peerId?.equals(maPeerId) !== true) {
          throw new InvalidParametersError('Multiaddrs must all have the same peer id or have no peer id')
        }
      }
    })
  }

  return {
    peerId,
    multiaddrs: peer
  }
}
