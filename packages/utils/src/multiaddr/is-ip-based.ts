import { CODE_IP4, CODE_IP6, CODE_IP6ZONE } from '@multiformats/multiaddr'
import type { Multiaddr } from '@multiformats/multiaddr'

/**
 * Check if a given multiaddr is IP-based
 */
export function isIpBased (ma: Multiaddr): boolean {
  try {
    for (const { code } of ma.getComponents()) {
      if (code === CODE_IP6ZONE) {
        continue
      }

      return code === CODE_IP4 || code === CODE_IP6
    }
  } catch {

  }

  return false
}
