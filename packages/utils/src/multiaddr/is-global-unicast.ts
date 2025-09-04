import { cidrContains } from '@chainsafe/netmask'
import { getNetConfig } from './get-net-config.ts'
import type { Multiaddr } from '@multiformats/multiaddr'

/**
 * Check if a given multiaddr is an IPv6 global unicast address
 */
export function isGlobalUnicast (ma: Multiaddr): boolean {
  try {
    const config = getNetConfig(ma)

    switch (config.type) {
      case 'ip6':
        return cidrContains('2000::/3', config.host)
      default:
        return false
    }
  } catch {
    return false
  }
}
