import { isLoopbackAddr } from 'is-loopback-addr'
import type { Multiaddr } from '@multiformats/multiaddr'

const CODEC_IP4 = 0x04
const CODEC_IP6 = 0x29

/**
 * Check if a given multiaddr is a loopback address.
 */
export function isLoopback (ma: Multiaddr): boolean {
  const [[codec]] = ma.tuples()

  if (codec !== CODEC_IP4 && codec !== CODEC_IP6) {
    // not an IP based multiaddr, cannot be loopback
    return false
  }

  const { address } = ma.nodeAddress()

  return isLoopbackAddr(address)
}
