import { InvalidParametersError } from '@libp2p/interface'
import { isMultiaddr, multiaddr } from '@multiformats/multiaddr'
import type { AddressFilter } from '../index.js'
import type { Address as AddressPB } from '../pb/peer.js'
import type { PeerId, Address } from '@libp2p/interface'
import type { AbortOptions } from '@multiformats/multiaddr'

export async function dedupeFilterAndSortAddresses (peerId: PeerId, filter: AddressFilter, addresses: Array<Address | AddressPB | undefined>, existingAddresses?: AddressPB[], options?: AbortOptions): Promise<AddressPB[]> {
  const addressMap = new Map<string, Address>()

  for (const addr of addresses) {
    if (addr == null) {
      continue
    }

    if (addr.multiaddr instanceof Uint8Array) {
      addr.multiaddr = multiaddr(addr.multiaddr)
    }

    if (!isMultiaddr(addr.multiaddr)) {
      throw new InvalidParametersError('Multiaddr was invalid')
    }

    if (!(await filter(peerId, addr.multiaddr, options))) {
      continue
    }

    const isCertified = addr.isCertified ?? false
    const maStr = addr.multiaddr.toString()
    const existingAddr = addressMap.get(maStr)

    if (existingAddr != null) {
      addr.isCertified = existingAddr.isCertified || isCertified
    } else {
      addressMap.set(maStr, {
        multiaddr: addr.multiaddr,
        isCertified
      })
    }
  }

  return [...addressMap.values()]
    .sort((a, b) => {
      return a.multiaddr.toString().localeCompare(b.multiaddr.toString())
    })
    .map(({ isCertified, multiaddr: ma }) => {
      // strip the trailing peerId if it is present
      const addrPeer = ma.getPeerId()

      if (peerId.equals(addrPeer)) {
        ma = ma.decapsulate(multiaddr(`/p2p/${peerId}`))
      }

      return {
        isCertified,
        multiaddr: ma.bytes
      }
    })
}
