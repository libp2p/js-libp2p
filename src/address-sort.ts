import type { Address } from '@libp2p/interface-peer-store'
import { isPrivate } from './multiaddr/is-private.js'

/**
 * Compare function for array.sort().
 * This sort aims to move the private addresses to the end of the array.
 * In case of equality, a certified address will come first.
 */
export function publicAddressesFirst (a: Address, b: Address): -1 | 0 | 1 {
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
