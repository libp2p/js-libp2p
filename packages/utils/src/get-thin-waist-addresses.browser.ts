import { multiaddr, type Multiaddr } from '@multiformats/multiaddr'

/**
 * Get all thin waist addresses that match the passed multiaddr. Wildcard IP4/6
 * addresses will be expanded into all available interfaces.
 */
export function getThinWaistAddresses (ma: Multiaddr): Multiaddr[] {
  const options = ma.toOptions()

  return [
    multiaddr(`/ip${options.family}/${options.host}/${options.transport}/${options.port}`)
  ]
}
