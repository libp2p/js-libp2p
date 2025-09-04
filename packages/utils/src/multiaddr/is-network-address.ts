import { getNetConfig } from './get-net-config.ts'
import type { Multiaddr } from '@multiformats/multiaddr'

/**
 * Check if a given multiaddr is a network address
 */
export function isNetworkAddress (ma: Multiaddr): boolean {
  try {
    getNetConfig(ma)

    return true
  } catch {
    return false
  }
}
