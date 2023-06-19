import { isLoopbackAddr } from 'is-loopback-addr'
import type { Multiaddr } from '@multiformats/multiaddr'

/**
 * Check if a given multiaddr is a loopback address.
 */
export function isLoopback (ma: Multiaddr): boolean {
  const { address } = ma.nodeAddress()

  return isLoopbackAddr(address)
}
