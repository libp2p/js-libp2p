import { isPrivateIp } from '../private-ip.js'
import type { Multiaddr } from '@multiformats/multiaddr'

const CODEC_IP4 = 0x04
const CODEC_IP6 = 0x29

/**
 * Check if a given multiaddr starts with a private address
 */
export function isPrivate (ma: Multiaddr): boolean {
  try {
    const [[codec, value]] = ma.stringTuples()

    if ((codec !== CODEC_IP4 && codec !== CODEC_IP6) || value == null) {
      // not an IP based multiaddr, cannot be private
      return false
    }

    return isPrivateIp(value) ?? false
  } catch {

  }

  return true
}
