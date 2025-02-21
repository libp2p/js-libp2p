import type { Multiaddr } from '@multiformats/multiaddr'

const CODEC_IP4 = 0x04
const CODEC_IP6 = 0x29
const CODEC_DNS = 0x35
const CODEC_DNS4 = 0x36
const CODEC_DNS6 = 0x37
const CODEC_DNSADDR = 0x38

const NETWORK_CODECS = [
  CODEC_IP4,
  CODEC_IP6,
  CODEC_DNS,
  CODEC_DNS4,
  CODEC_DNS6,
  CODEC_DNSADDR
]

/**
 * Check if a given multiaddr is a network address
 */
export function isNetworkAddress (ma: Multiaddr): boolean {
  try {
    const [[codec]] = ma.stringTuples()

    return NETWORK_CODECS.includes(codec)
  } catch {

  }

  return false
}
