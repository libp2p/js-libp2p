import { isPrivateIp } from '../private-ip.js'
import type { Multiaddr } from '@multiformats/multiaddr'

const CODEC_IP4 = 0x04
const CODEC_IP6 = 0x29
const CODEC_DNS = 0x35
const CODEC_DNS4 = 0x36
const CODEC_DNS6 = 0x37
const CODEC_DNSADDR = 0x38

/**
 * Check if a given multiaddr starts with a private address
 */
export function isPrivate (ma: Multiaddr): boolean {
  try {
    const [[codec, value]] = ma.stringTuples()

    if (value == null) {
      return true
    }

    if (codec === CODEC_DNS || codec === CODEC_DNS4 || codec === CODEC_DNS6 || codec === CODEC_DNSADDR) {
      return false
    }

    if (codec === CODEC_IP4 || codec === CODEC_IP6) {
      return isPrivateIp(value) ?? false
    }
  } catch {

  }

  return true
}
