import { CODE_IP4, CODE_IP6, CODE_IP6ZONE, CODE_DNS, CODE_DNS4, CODE_DNS6, CODE_DNSADDR } from '@multiformats/multiaddr'
import type { Multiaddr } from '@multiformats/multiaddr'

const NETWORK_CODECS = [
  CODE_IP4,
  CODE_IP6,
  CODE_DNS,
  CODE_DNS4,
  CODE_DNS6,
  CODE_DNSADDR
]

/**
 * Check if a given multiaddr is a network address
 */
export function isNetworkAddress (ma: Multiaddr): boolean {
  try {
    for (const { code } of ma.getComponents()) {
      if (code === CODE_IP6ZONE) {
        continue
      }

      return NETWORK_CODECS.includes(code)
    }
  } catch {

  }

  return false
}
