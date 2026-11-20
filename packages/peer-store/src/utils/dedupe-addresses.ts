import { InvalidParametersError } from '@libp2p/interface'
import { CODE_P2P, isMultiaddr, multiaddr } from '@multiformats/multiaddr'
import type { AddressFilter } from '../index.ts'
import type { Address as AddressPB } from '../pb/peer.ts'
import type { PeerId, Address, AbortOptions, Logger } from '@libp2p/interface'

export interface DedupeAddressesOptions extends AbortOptions {
  maxAddresses?: number
  log?: Logger
}

export async function dedupeFilterAndSortAddresses (peerId: PeerId, filter: AddressFilter, addresses: Array<Address | AddressPB | undefined>, existingAddresses?: AddressPB[], options?: DedupeAddressesOptions): Promise<AddressPB[]> {
  const maxAddresses = options?.maxAddresses ?? Infinity
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

  let entries = [...addressMap.entries()]

  if (entries.length > maxAddresses) {
    options?.log?.('%p has %d addresses, only storing %d', peerId, entries.length, maxAddresses)

    // prefer certified addresses, then addresses in the order they were
    // passed - e.g. existing addresses before new ones
    entries = [
      ...entries.filter(([, addr]) => addr.isCertified),
      ...entries.filter(([, addr]) => !addr.isCertified)
    ].slice(0, maxAddresses)
  }

  return entries
    .sort(([a], [b]) => {
      return a.localeCompare(b)
    })
    .map(([, { isCertified, multiaddr: ma }]) => {
      // strip the trailing peerId if it is present
      const addrPeer = ma.getComponents().find(c => c.code === CODE_P2P)?.value

      if (peerId.equals(addrPeer)) {
        ma = ma.decapsulate(multiaddr(`/p2p/${peerId}`))
      }

      return {
        isCertified,
        multiaddr: ma.bytes
      }
    })
}
