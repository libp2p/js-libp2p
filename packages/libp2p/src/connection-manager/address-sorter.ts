import {
  reliableTransportsFirst,
  loopbackAddressLast,
  publicAddressesFirst,
  circuitRelayAddressesLast
} from '@libp2p/utils'
import type { Address } from '@libp2p/interface'

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
  return addresses.sort((a, b) =>
    loopbackAddressLast(a.multiaddr, b.multiaddr) ||
    publicAddressesFirst(a.multiaddr, b.multiaddr) ||
    circuitRelayAddressesLast(a.multiaddr, b.multiaddr) ||
    certifiedAddressesFirst(a, b) ||
    reliableTransportsFirst(a.multiaddr, b.multiaddr)
  )
}
