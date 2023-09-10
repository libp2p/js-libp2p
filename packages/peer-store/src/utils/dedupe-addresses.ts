import { CodeError } from '@libp2p/interface/errors'
import { isMultiaddr, multiaddr } from '@multiformats/multiaddr'
import { codes } from '../errors.js'
import type { AddressFilter } from '../index.js'
import type { Address as AddressPB } from '../pb/peer.js'
import type { PeerId } from '@libp2p/interface/peer-id'
import type { Address } from '@libp2p/interface/peer-store'

export async function dedupeFilterAndSortAddresses (peerId: PeerId, filter: AddressFilter, addresses: Array<Address | AddressPB | undefined>): Promise<AddressPB[]> {
  const addressMap = new Map<string, Address>()

  for (const addr of addresses) {
    if (addr == null) {
      continue
    }

    if (addr.multiaddr instanceof Uint8Array) {
      addr.multiaddr = multiaddr(addr.multiaddr)
    }

    if (!isMultiaddr(addr.multiaddr)) {
      throw new CodeError('Multiaddr was invalid', codes.ERR_INVALID_PARAMETERS)
    }

    if (!(await filter(peerId, addr.multiaddr))) {
      continue
    }

    const maStr = addr.multiaddr.toString()
    let existingAddr = addressMap.get(maStr)

    if (existingAddr == null) {
      existingAddr = {
        multiaddr: addr.multiaddr
      }

      addressMap.set(maStr, existingAddr)
    }

    if (addr.isCertified) {
      existingAddr.isCertified = true
    }

    if (addr.lastFailure != null) {
      existingAddr.lastFailure = Number(addr.lastFailure)
    }

    if (addr.lastSuccess != null) {
      existingAddr.lastSuccess = Number(addr.lastSuccess)
    }
  }

  return [...addressMap.values()]
    .sort((a, b) => {
      return a.multiaddr.toString().localeCompare(b.multiaddr.toString())
    })
    .map(({ isCertified, multiaddr, lastFailure, lastSuccess }) => {
      const addr: AddressPB = {
        multiaddr: multiaddr.bytes,
      }

      if (isCertified) {
        addr.isCertified = true
      }

      if (lastFailure != null) {
        addr.lastFailure = BigInt(lastFailure)
      }

      if (lastSuccess != null) {
        addr.lastSuccess = BigInt(lastSuccess)
      }

      return addr
    })
}
