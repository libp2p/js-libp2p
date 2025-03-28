import { InvalidMultiaddrError, InvalidParametersError, isPeerId } from '@libp2p/interface'
import { peerIdFromString } from '@libp2p/peer-id'
import { isMultiaddr } from '@multiformats/multiaddr'
import { PEER_ID } from '@multiformats/multiaddr-matcher'
import type { PeerId } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'

export interface PeerAddress {
  peerId?: PeerId
  multiaddrs: Multiaddr[]
}

/**
 * Extracts a PeerId and/or multiaddr from the passed PeerId or Multiaddr or an
 * array of Multiaddrs
 */
export function getPeerAddress (peer: PeerId | Multiaddr | Multiaddr[]): PeerAddress {
  if (isPeerId(peer)) {
    return { peerId: peer, multiaddrs: [] }
  }

  let multiaddrs = Array.isArray(peer) ? peer : [peer]

  let peerId: PeerId | undefined

  if (multiaddrs.length > 0) {
    const peerIdStr = multiaddrs[0].getPeerId()
    peerId = peerIdStr == null ? undefined : peerIdFromString(peerIdStr)

    // ensure PeerId is either not set or is consistent
    multiaddrs.forEach(ma => {
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

  // ignore any `/p2p/Qmfoo`-style addresses as we will include the peer id in
  // the returned value of this function
  multiaddrs = multiaddrs.filter(ma => {
    return !PEER_ID.exactMatch(ma)
  })

  return {
    peerId,
    multiaddrs
  }
}
