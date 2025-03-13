import os from 'node:os'
import { multiaddr, type Multiaddr } from '@multiformats/multiaddr'

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
 * passed multiaddr.
 *
 * Wildcard IP4/6 addresses will be expanded into all available interfaces.
 */
export function getThinWaistAddresses (ma: Multiaddr): Multiaddr[] {
  const options = ma.toOptions()

  if (isWildcard(options.host)) {
    const addrs = []

    for (const host of getNetworkAddrs(options.family)) {
      addrs.push(multiaddr(`/ip${options.family}/${host}/${options.transport}/${options.port}`))
    }

    return addrs
  }

  return [
    multiaddr(`/ip${options.family}/${options.host}/${options.transport}/${options.port}`)
  ]
}
