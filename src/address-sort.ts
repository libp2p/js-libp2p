/**
 * @packageDocumentation
 *
 * Provides strategies to sort a list of multiaddrs.
 *
 * @example
 *
 * ```typescript
 * import { publicAddressesFirst } from '@libp2p/utils/address-sort'
 * import { multiaddr } from '@multformats/multiaddr'
 *
 *
 * const addresses = [
 *   multiaddr('/ip4/127.0.0.1/tcp/9000'),
 *   multiaddr('/ip4/82.41.53.1/tcp/9000')
 * ].sort(publicAddressesFirst)
 *
 * console.info(addresses)
 * // ['/ip4/82.41.53.1/tcp/9000', '/ip4/127.0.0.1/tcp/9000']
 * ```
 */

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

/**
 * A test thing
 */
export async function something (): Promise<Uint8Array> {
  return Uint8Array.from([0, 1, 2])
}
