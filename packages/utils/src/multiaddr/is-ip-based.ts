import type { Multiaddr } from '@multiformats/multiaddr'

const CODEC_IP4 = 0x04
const CODEC_IP6 = 0x29

/**
 * Check if a given multiaddr is IP-based
 */
export function isIpBased (ma: Multiaddr): boolean {
  try {
    const [[codec]] = ma.stringTuples()

    return codec === CODEC_IP4 || codec === CODEC_IP6
  } catch {

  }

  return false
}
