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
