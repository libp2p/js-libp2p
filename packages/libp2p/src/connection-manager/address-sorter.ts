import {
  reliableTransportsFirst,
  loopbackAddressLast,
  publicAddressesFirst,
  circuitRelayAddressesLast
} from '@libp2p/utils'
import type { Address } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'

const asMultiaddr = (fn: (a: Multiaddr, b: Multiaddr) => -1 | 0 | 1) =>
  (a: Address, b: Address): -1 | 0 | 1 => fn(a.multiaddr, b.multiaddr)

/**
 * Compare function for array.sort() that moves certified addresses to the start
 * of the array.
 */
export function certifiedAddressesFirst (a: Address, b: Address): -1 | 0 | 1 {
  if (a.isCertified && !b.isCertified) {
    return -1
  } else if (!a.isCertified && b.isCertified) {
    return 1
  }

  return 0
}

export function defaultAddressSorter (addresses: Address[]): Address[] {
  return addresses
    .sort(asMultiaddr(reliableTransportsFirst))
    .sort(certifiedAddressesFirst)
    .sort(asMultiaddr(circuitRelayAddressesLast))
    .sort(asMultiaddr(publicAddressesFirst))
    .sort(asMultiaddr(loopbackAddressLast))
}
