import type { Multiaddr } from '@multiformats/multiaddr'

const CODEC_IP4 = 0x04
const CODEC_IP6 = 0x29

/**
 * Check if a given multiaddr is a link-local address
 */
export function isLinkLocal (ma: Multiaddr): boolean {
  try {
    const [[codec, value]] = ma.stringTuples()

    if (value == null) {
      return false
    }

    if (codec === CODEC_IP4) {
      return value.startsWith('169.254.')
    }

    if (codec === CODEC_IP6) {
      return value.toLowerCase().startsWith('fe80')
    }
  } catch {

  }

  return false
}
