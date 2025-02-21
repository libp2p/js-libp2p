import { isLoopbackAddr } from 'is-loopback-addr'
import { isIpBased } from './is-ip-based.js'
import type { Multiaddr } from '@multiformats/multiaddr'

/**
 * Check if a given multiaddr is a loopback address.
 */
export function isLoopback (ma: Multiaddr): boolean {
  if (!isIpBased(ma)) {
    // not an IP based multiaddr, cannot be private
    return false
  }

  const { address } = ma.nodeAddress()

  return isLoopbackAddr(address)
}
