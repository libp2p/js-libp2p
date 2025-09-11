import { getNetConfig } from './get-net-config.ts'
import type { Multiaddr } from '@multiformats/multiaddr'

/**
 * Check if a given multiaddr is a link-local address
 */
export function isLinkLocal (ma: Multiaddr): boolean {
  try {
    const config = getNetConfig(ma)

    switch (config.type) {
      case 'ip4':
        return config.host.startsWith('169.254.')
      case 'ip6':
        return config.host.toLowerCase().startsWith('fe80')
      default:
        return false
    }
  } catch (err) {
    return false
  }
}
