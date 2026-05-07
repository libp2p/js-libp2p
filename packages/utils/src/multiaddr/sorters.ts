import { Circuit, WebSockets, WebSocketsSecure, WebRTC, WebRTCDirect, WebTransport, TCP } from '@multiformats/multiaddr-matcher'
import { isLoopback } from './is-loopback.ts'
import { isPrivate } from './is-private.ts'
import type { Multiaddr } from '@multiformats/multiaddr'

/**
 * Sorts addresses by order of reliability, where they have presented the fewest
 * problems:
 *
 * TCP -> WebSockets/Secure -> WebRTC -> WebRTCDirect -> WebTransport
 */
// eslint-disable-next-line complexity
export function reliableTransportsFirst (a: Multiaddr, b: Multiaddr): -1 | 0 | 1 {
  const isATcp = TCP.exactMatch(a)
  const isBTcp = TCP.exactMatch(b)

  if (isATcp && !isBTcp) {
    return -1
  }

  if (!isATcp && isBTcp) {
    return 1
  }

  const isAWebSocketSecure = WebSocketsSecure.exactMatch(a)
  const isBWebSocketSecure = WebSocketsSecure.exactMatch(b)

  if (isAWebSocketSecure && !isBWebSocketSecure) {
    return -1
  }

  if (!isAWebSocketSecure && isBWebSocketSecure) {
    return 1
  }

  const isAWebSocket = WebSockets.exactMatch(a)
  const isBWebSocket = WebSockets.exactMatch(b)

  if (isAWebSocket && !isBWebSocket) {
    return -1
  }

  if (!isAWebSocket && isBWebSocket) {
    return 1
  }

  const isAWebRTC = WebRTC.exactMatch(a)
  const isBWebRTC = WebRTC.exactMatch(b)

  if (isAWebRTC && !isBWebRTC) {
    return -1
  }

  if (!isAWebRTC && isBWebRTC) {
    return 1
  }

  const isAWebRTCDirect = WebRTCDirect.exactMatch(a)
  const isBWebRTCDirect = WebRTCDirect.exactMatch(b)

  if (isAWebRTCDirect && !isBWebRTCDirect) {
    return -1
  }

  if (!isAWebRTCDirect && isBWebRTCDirect) {
    return 1
  }

  const isAWebTransport = WebTransport.exactMatch(a)
  const isBWebTransport = WebTransport.exactMatch(b)

  if (isAWebTransport && !isBWebTransport) {
    return -1
  }

  if (!isAWebTransport && isBWebTransport) {
    return 1
  }

  // ... everything else
  return 0
}

/**
 * Compare function for array.sort() that moves loopback addresses to the end
 * of the array.
 */
export function loopbackAddressLast (a: Multiaddr, b: Multiaddr): -1 | 0 | 1 {
  const isALoopback = isLoopback(a)
  const isBLoopback = isLoopback(b)

  if (isALoopback && !isBLoopback) {
    return 1
  } else if (!isALoopback && isBLoopback) {
    return -1
  }

  return 0
}

/**
 * Compare function for array.sort() that moves public addresses to the start
 * of the array.
 */
export function publicAddressesFirst (a: Multiaddr, b: Multiaddr): -1 | 0 | 1 {
  const isAPrivate = isPrivate(a)
  const isBPrivate = isPrivate(b)

  if (isAPrivate && !isBPrivate) {
    return 1
  } else if (!isAPrivate && isBPrivate) {
    return -1
  }

  return 0
}

/**
 * Compare function for array.sort() that moves circuit relay addresses to the
 * end of the array.
 */
export function circuitRelayAddressesLast (a: Multiaddr, b: Multiaddr): -1 | 0 | 1 {
  const isACircuit = Circuit.exactMatch(a)
  const isBCircuit = Circuit.exactMatch(b)

  if (isACircuit && !isBCircuit) {
    return 1
  } else if (!isACircuit && isBCircuit) {
    return -1
  }

  return 0
}

/**
 * Sort multiaddrs by the default multiaddr-only ordering: loopback addresses
 * last, public addresses first, circuit-relay addresses last, with reliable
 * transports as the innermost tiebreaker.
 */
export function defaultMultiaddrSorter (multiaddrs: Multiaddr[]): Multiaddr[] {
  return multiaddrs.sort((a, b) =>
    loopbackAddressLast(a, b) ||
    publicAddressesFirst(a, b) ||
    circuitRelayAddressesLast(a, b) ||
    reliableTransportsFirst(a, b)
  )
}
