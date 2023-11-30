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

import { Circuit } from '@multiformats/multiaddr-matcher'
import { isPrivate } from './multiaddr/is-private.js'
import type { Address } from '@libp2p/interface'

/**
 * Compare function for array.sort() that moves public addresses to the start
 * of the array.
 */
export function publicAddressesFirst (a: Address, b: Address): -1 | 0 | 1 {
  const isAPrivate = isPrivate(a.multiaddr)
  const isBPrivate = isPrivate(b.multiaddr)

  if (isAPrivate && !isBPrivate) {
    return 1
  } else if (!isAPrivate && isBPrivate) {
    return -1
  }

  return 0
}

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

/**
 * Compare function for array.sort() that moves circuit relay addresses to the
 * start of the array.
 */
export function circuitRelayAddressesLast (a: Address, b: Address): -1 | 0 | 1 {
  const isACircuit = Circuit.exactMatch(a.multiaddr)
  const isBCircuit = Circuit.exactMatch(b.multiaddr)

  if (isACircuit && !isBCircuit) {
    return 1
  } else if (!isACircuit && isBCircuit) {
    return -1
  }

  return 0
}

export function defaultAddressSort (a: Address, b: Address): -1 | 0 | 1 {
  const publicResult = publicAddressesFirst(a, b)

  if (publicResult !== 0) {
    return publicResult
  }

  const relayResult = circuitRelayAddressesLast(a, b)

  if (relayResult !== 0) {
    return relayResult
  }

  const certifiedResult = certifiedAddressesFirst(a, b)

  return certifiedResult
}
