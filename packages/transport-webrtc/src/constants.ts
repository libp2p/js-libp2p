/**
 * STUN servers help clients discover their own public IPs.
 *
 * Using five or more servers causes warnings to be printed so
 * ensure we limit it to max x4
 *
 * @see https://gist.github.com/mondain/b0ec1cf5f60ae726202e
 */
export const DEFAULT_ICE_SERVERS = [
  'stun:stun.l.google.com:19302',
  'stun:global.stun.twilio.com:3478',
  'stun:stun.cloudflare.com:3478',
  'stun:stun.services.mozilla.com:3478'
]

export const UFRAG_ALPHABET = Array.from('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890')

export const UFRAG_PREFIX = 'libp2p+webrtc+v1/'

/**
 * The time to wait, in milliseconds, for the data channel handshake to complete
 */
export const HANDSHAKE_TIMEOUT_MS = 10_000
export const CODEC_WEBRTC_DIRECT = 0x0118
export const CODEC_CERTHASH = 0x01d2

/**
 * Inbound connection upgrades must complete within this many ms
 */
export const INBOUND_UPGRADE_TIMEOUT = 10_000
