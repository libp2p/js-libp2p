import { getNetConfig, isNetworkAddress } from '@libp2p/utils'
import type { Multiaddr } from '@multiformats/multiaddr'

export function multiaddrToIPStr (multiaddr: Multiaddr): string | null {
  if (isNetworkAddress(multiaddr)) {
    const config = getNetConfig(multiaddr)

    switch (config.type) {
      case 'ip4':
      case 'ip6':

        return config.host
      default:
        break
    }
  }

  return null
}
