import { cidrContains } from '@chainsafe/netmask'
import { CODE_IP6 } from '@multiformats/multiaddr'
import type { Multiaddr } from '@multiformats/multiaddr'

/**
 * Check if a given multiaddr is an IPv6 global unicast address
 */
export function isGlobalUnicast (ma: Multiaddr): boolean {
  try {
    for (const { code, value } of ma.getComponents()) {
      if (value == null) {
        continue
      }

      if (code === CODE_IP6) {
        return cidrContains('2000::/3', value)
      }
    }
  } catch {

  }

  return false
}
