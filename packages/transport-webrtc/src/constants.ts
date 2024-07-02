/**
 * STUN servers help clients discover their own public IPs
 *
 * @see https://gist.github.com/mondain/b0ec1cf5f60ae726202e
 */
export const DEFAULT_ICE_SERVERS = [
  'stun:stun.l.google.com:19302',
  'stun:stun1.l.google.com:19302',
  'stun:stun2.l.google.com:19302',
  'stun:stun3.l.google.com:19302',
  'stun:stun4.l.google.com:19302',
  'stun:global.stun.twilio.com:3478',
  'stun:stun.cloudflare.com:3478',
  'stun:stun.services.mozilla.com:3478',
  'stun:stun.1und1.de:3478'
]
