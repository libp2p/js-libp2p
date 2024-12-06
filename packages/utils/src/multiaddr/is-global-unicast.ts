import { cidrContains } from '@chainsafe/netmask'
import type { Multiaddr } from '@multiformats/multiaddr'

const CODEC_IP6 = 0x29

/**
 * Check if a given multiaddr is an IPv6 global unicast address
 */
export function isGlobalUnicast (ma: Multiaddr): boolean {
  try {
    const [[codec, value]] = ma.stringTuples()

    if (value == null) {
      return false
    }

    if (codec === CODEC_IP6) {
      return cidrContains('2000::/3', value)
    }
  } catch {

  }

  return false
}
