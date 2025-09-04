import { isPrivateIp } from '../private-ip.js'
import { getNetConfig } from './get-net-config.ts'
import type { Multiaddr } from '@multiformats/multiaddr'

/**
 * Check if a given multiaddr starts with a private address
 */
export function isPrivate (ma: Multiaddr): boolean {
  try {
    const config = getNetConfig(ma)

    switch (config.type) {
      case 'ip4':
      case 'ip6':
        return isPrivateIp(config.host) ?? false
      default:
        return config.host === 'localhost'
    }
  } catch {
    return false
  }
}
