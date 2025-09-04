import { isLoopbackAddr } from 'is-loopback-addr'
import { getNetConfig } from './get-net-config.ts'
import type { Multiaddr } from '@multiformats/multiaddr'

/**
 * Check if a given multiaddr is a loopback address.
 */
export function isLoopback (ma: Multiaddr): boolean {
  try {
    const config = getNetConfig(ma)

    switch (config.type) {
      case 'ip4':
      case 'ip6':
        return isLoopbackAddr(config.host)
      default:
        return false
    }
  } catch {
    return false
  }
}
