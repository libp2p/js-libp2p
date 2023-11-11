import { CodeError } from '@libp2p/interface/errors'
import { isMultiaddr, multiaddr, type Multiaddr } from '@multiformats/multiaddr'
import { codes } from '../errors.js'
import type { Address as PbPeerAddress } from '../pb/peer'
import type { PeerId } from '@libp2p/interface/peer-id'
import type { Address } from '@libp2p/interface/peer-store'

/**
 * Converts {@link PbPeerAddress}[] for a peer that may not contain the {@link PeerId} to {@link Address}[]
 * that do contain the {@link PeerId}.
 */
export function addressesWithPeerIds (peerId: PeerId, addresses: PbPeerAddress[]): Address[] {
  return addresses.map(({ multiaddr: ma, isCertified }) => {
    let newMa: Multiaddr = multiaddr(ma)
    if (!isMultiaddr(newMa)) {
      throw new CodeError('Multiaddr was invalid', codes.ERR_INVALID_PARAMETERS)
    }

    if (newMa.getPeerId() == null) {
      newMa = newMa.encapsulate(`/p2p/${peerId.toString()}`)
    } else if (newMa.getPeerId() !== peerId.toString()) {
      // peer ID is not null and does not match expected peerId
      throw new Error('PeerId in multiaddr did not match peer\'s peerId')
    }

    const address: Address = {
      multiaddr: newMa,
      isCertified: isCertified ?? false
    }

    return address
  })
}
