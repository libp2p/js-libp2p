import { CodeError } from '@libp2p/interface/errors'
import { isMultiaddr } from '@multiformats/multiaddr'
import { codes } from '../errors.js'
import type { PeerId } from '@libp2p/interface/peer-id'
import type { Address } from '@libp2p/interface/peer-store'

/**
 * Converts {@link Address}[] for a peer that may not contain the {@link PeerId} to {@link Address}[]
 * that do contain the {@link PeerId}.
 */
export function addressToFqMultiaddr (peerId: PeerId, addresses: Address[]): Address[] {
  return addresses.map(({ multiaddr, isCertified }) => {
    if (!isMultiaddr(multiaddr)) {
      throw new CodeError('Multiaddr was invalid', codes.ERR_INVALID_PARAMETERS)
    }

    // is checking for null enough or should we check if peerId.toString() is a mismatch?
    if (multiaddr.getPeerId() !== peerId.toString()) {
      multiaddr = multiaddr.encapsulate(`/p2p/${peerId.toString()}`)
    }

    return {
      multiaddr,
      isCertified
    }
  })
}
