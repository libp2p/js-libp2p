import isIpPrivate from 'private-ip'
import type { Multiaddr } from '@multiformats/multiaddr'

/**
 * Check if a given multiaddr has a private address.
 */
export function isPrivate (ma: Multiaddr): boolean {
  try {
    const { address } = ma.nodeAddress()

    return Boolean(isIpPrivate(address))
  } catch {
    return true
  }
}
