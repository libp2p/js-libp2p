import { getNetConfig } from './multiaddr/get-net-config.ts'
import { netConfigToMultiaddr } from './multiaddr/utils.ts'
import type { Multiaddr } from '@multiformats/multiaddr'

/**
 * Get all thin waist addresses on the current host that match the family of the
 * passed multiaddr and optionally override the port.
 *
 * Wildcard IP4/6 addresses will be expanded into all available interfaces.
 */
export function getThinWaistAddresses (ma?: Multiaddr, port?: number | string): Multiaddr[] {
  if (ma == null) {
    return []
  }

  const config = getNetConfig(ma)

  return [
    netConfigToMultiaddr(config, port)
  ]
}
