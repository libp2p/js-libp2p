import { peerIdFromString } from '@libp2p/peer-id'
import type { Multiaddr } from '@multiformats/multiaddr'
import { isMultiaddr } from '@multiformats/multiaddr'
import errCode from 'err-code'
import { codes } from './errors.js'
import { isPeerId } from '@libp2p/interface-peer-id'
import type { PeerId } from '@libp2p/interface-peer-id'

/**
 * Extracts a PeerId and/or multiaddr from the passed PeerId or Multiaddr or an array of Multiaddrs
 */
export function getPeerAddress (peer: PeerId | Multiaddr | Multiaddr[]): { peerId?: PeerId, multiaddr?: Multiaddr } {
  if (Array.isArray(peer)) {
    const firstPeerId = peer[0].getPeerId()
    if (peer.every((p) => p.getPeerId() === firstPeerId) && firstPeerId !== null) {
      return {
        peerId: peerIdFromString(firstPeerId)
      }
    }

    if (peer.every((p) => p.getPeerId() === null)) {
      return {
        multiaddr: peer[0]
      }
    }
  }

  if (isPeerId(peer)) {
    return {
      peerId: peer
    }
  }

  if (isMultiaddr(peer)) {
    const peerId = peer.getPeerId()

    return {
      multiaddr: peer,
      peerId: peerId == null ? undefined : peerIdFromString(peerId)
    }
  }

  throw errCode(
    new Error(`${peer} is not a PeerId or a Multiaddr`), // eslint-disable-line @typescript-eslint/restrict-template-expressions
    codes.ERR_INVALID_MULTIADDR
  )
}
