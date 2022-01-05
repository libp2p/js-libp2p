import type { Multiaddr } from '@multiformats/multiaddr'
import isIpPrivate from 'private-ip'

/**
 * Check if a given multiaddr has a private address.
 */
export function isPrivate (ma: Multiaddr) {
  const { address } = ma.nodeAddress()

  return Boolean(isIpPrivate(address))
}
