import { peerIdFromString } from '@libp2p/peer-id'
import type { Multiaddr } from '@multiformats/multiaddr'
import { isMultiaddr } from '@multiformats/multiaddr'
import { CodeError } from '@libp2p/interfaces/errors'
import { codes } from './errors.js'
import { isPeerId } from '@libp2p/interface-peer-id'
import type { PeerId } from '@libp2p/interface-peer-id'
import { logger } from '@libp2p/logger'

const log = logger('libp2p:get-peer')

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
        log.error('multiaddr %s was invalid', ma)
        throw new CodeError('Invalid Multiaddr', codes.ERR_INVALID_MULTIADDR)
      }

      const maPeerIdStr = ma.getPeerId()

      if (maPeerIdStr == null) {
        if (peerId != null) {
          throw new CodeError('Multiaddrs must all have the same peer id or have no peer id', codes.ERR_INVALID_PARAMETERS)
        }
      } else {
        const maPeerId = peerIdFromString(maPeerIdStr)

        if (peerId == null || !peerId.equals(maPeerId)) {
          throw new CodeError('Multiaddrs must all have the same peer id or have no peer id', codes.ERR_INVALID_PARAMETERS)
        }
      }
    })
  }

  return {
    peerId,
    multiaddrs: peer
  }
}
