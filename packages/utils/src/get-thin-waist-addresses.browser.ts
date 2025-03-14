import { multiaddr } from '@multiformats/multiaddr'
import type { Multiaddr } from '@multiformats/multiaddr'

/**
 * Get all thin waist addresses on the current host that match the family of the
 * passed multiaddr and optionally override the port.
 *
 * Wildcard IP4/6 addresses will be expanded into all available interfaces.
 */
export function getThinWaistAddresses (ma?: Multiaddr, port?: number): Multiaddr[] {
  if (ma == null) {
    return []
  }

  const options = ma.toOptions()

  return [
    multiaddr(`/ip${options.family}/${options.host}/${options.transport}/${port ?? options.port}`)
  ]
}
