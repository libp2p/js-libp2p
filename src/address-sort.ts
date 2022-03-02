import type { Multiaddr } from '@multiformats/multiaddr'
import { isPrivate } from './multiaddr/is-private.js'

interface Address {
  multiaddr: Multiaddr
  isCertified: boolean
}

/**
 * Compare function for array.sort().
 * This sort aims to move the private adresses to the end of the array.
 * In case of equality, a certified address will come first.
 */
function addressesPublicFirstCompareFunction (a: Address, b: Address) {
  const isAPrivate = isPrivate(a.multiaddr)
  const isBPrivate = isPrivate(b.multiaddr)

  if (isAPrivate && !isBPrivate) {
    return 1
  } else if (!isAPrivate && isBPrivate) {
    return -1
  }
  // Check certified?
  if (a.isCertified && !b.isCertified) {
    return -1
  } else if (!a.isCertified && b.isCertified) {
    return 1
  }

  return 0
}

/**
 * Sort given addresses by putting public addresses first.
 * In case of equality, a certified address will come first.
 */
export function publicAddressesFirst (addresses: Address[]) {
  return [...addresses].sort(addressesPublicFirstCompareFunction)
}
