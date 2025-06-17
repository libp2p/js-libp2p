import { CODE_IP4, CODE_IP6, CODE_IP6ZONE } from '@multiformats/multiaddr'
import type { Multiaddr } from '@multiformats/multiaddr'

/**
 * Check if a given multiaddr is a link-local address
 */
export function isLinkLocal (ma: Multiaddr): boolean {
  try {
    for (const { code, value } of ma.getComponents()) {
      if (code === CODE_IP6ZONE) {
        continue
      }

      if (value == null) {
        continue
      }

      if (code === CODE_IP4) {
        return value.startsWith('169.254.')
      }

      if (code === CODE_IP6) {
        return value.toLowerCase().startsWith('fe80')
      }
    }
  } catch {

  }

  return false
}
