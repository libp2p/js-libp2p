import { isPrivateIp } from '../private-ip.js'
import type { Multiaddr } from '@multiformats/multiaddr'

/**
 * Check if a given multiaddr has a private address.
 */
export function isPrivate (ma: Multiaddr): boolean {
  try {
    const { address } = ma.nodeAddress()

    return Boolean(isPrivateIp(address))
  } catch {
    return true
  }
}
