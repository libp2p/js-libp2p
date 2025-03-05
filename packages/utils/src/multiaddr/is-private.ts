import { isPrivateIp } from '../private-ip.js'
import { isIpBased } from './is-ip-based.js'
import type { Multiaddr } from '@multiformats/multiaddr'

/**
 * Check if a given multiaddr starts with a private address
 */
export function isPrivate (ma: Multiaddr): boolean {
  try {
    if (!isIpBased(ma)) {
      // not an IP based multiaddr, cannot be private
      return false
    }

    const [[, value]] = ma.stringTuples()

    if (value == null) {
      return false
    }

    return isPrivateIp(value) ?? false
  } catch {

  }

  return true
}
