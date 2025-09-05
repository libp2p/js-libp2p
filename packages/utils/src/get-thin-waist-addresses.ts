import os from 'node:os'
import { isLinkLocalIp } from './link-local-ip.js'
import { getNetConfig } from './multiaddr/get-net-config.ts'
import { netConfigToMultiaddr } from './multiaddr/utils.ts'
import type { Multiaddr } from '@multiformats/multiaddr'

const FAMILIES = { 4: 'IPv4', 6: 'IPv6' }

function isWildcard (ip: string): boolean {
  return ['0.0.0.0', '::'].includes(ip)
}

function getNetworkAddrs (family: 4 | 6): string[] {
  const addresses: string[] = []
  const networks = os.networkInterfaces()

  for (const [, netAddrs] of Object.entries(networks)) {
    if (netAddrs != null) {
      for (const netAddr of netAddrs) {
        if (isLinkLocalIp(netAddr.address)) {
          continue
        }

        if (netAddr.family === FAMILIES[family]) {
          addresses.push(netAddr.address)
        }
      }
    }
  }

  return addresses
}

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

  if ((config.type === 'ip4' || config.type === 'ip6') && isWildcard(config.host)) {
    return getNetworkAddrs(config.type === 'ip4' ? 4 : 6)
      .map(host => netConfigToMultiaddr(config, port, host))
  }

  return [
    netConfigToMultiaddr(config, port)
  ]
}
