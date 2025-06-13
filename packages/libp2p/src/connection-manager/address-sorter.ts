import { isLoopback } from '@libp2p/utils/multiaddr/is-loopback'
import { isPrivate } from '@libp2p/utils/multiaddr/is-private'
import { Circuit, WebSockets, WebSocketsSecure, WebRTC, WebRTCDirect, WebTransport, TCP } from '@multiformats/multiaddr-matcher'
import type { Address } from '@libp2p/interface'

/**
 * Sorts addresses by order of reliability, where they have presented the fewest
 * problems:
 *
 * TCP -> WebSockets/Secure -> WebRTC -> WebRTCDirect -> WebTransport
 */
// eslint-disable-next-line complexity
export function reliableTransportsFirst (a: Address, b: Address): -1 | 0 | 1 {
  const isATcp = TCP.exactMatch(a.multiaddr)
  const isBTcp = TCP.exactMatch(b.multiaddr)

  if (isATcp && !isBTcp) {
    return -1
  }

  if (!isATcp && isBTcp) {
    return 1
  }

  const isAWebSocketSecure = WebSocketsSecure.exactMatch(a.multiaddr)
  const isBWebSocketSecure = WebSocketsSecure.exactMatch(b.multiaddr)

  if (isAWebSocketSecure && !isBWebSocketSecure) {
    return -1
  }

  if (!isAWebSocketSecure && isBWebSocketSecure) {
    return 1
  }

  const isAWebSocket = WebSockets.exactMatch(a.multiaddr)
  const isBWebSocket = WebSockets.exactMatch(b.multiaddr)

  if (isAWebSocket && !isBWebSocket) {
    return -1
  }

  if (!isAWebSocket && isBWebSocket) {
    return 1
  }

  const isAWebRTC = WebRTC.exactMatch(a.multiaddr)
  const isBWebRTC = WebRTC.exactMatch(b.multiaddr)

  if (isAWebRTC && !isBWebRTC) {
    return -1
  }

  if (!isAWebRTC && isBWebRTC) {
    return 1
  }

  const isAWebRTCDirect = WebRTCDirect.exactMatch(a.multiaddr)
  const isBWebRTCDirect = WebRTCDirect.exactMatch(b.multiaddr)

  if (isAWebRTCDirect && !isBWebRTCDirect) {
    return -1
  }

  if (!isAWebRTCDirect && isBWebRTCDirect) {
    return 1
  }

  const isAWebTransport = WebTransport.exactMatch(a.multiaddr)
  const isBWebTransport = WebTransport.exactMatch(b.multiaddr)

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
export function loopbackAddressLast (a: Address, b: Address): -1 | 0 | 1 {
  const isALoopback = isLoopback(a.multiaddr)
  const isBLoopback = isLoopback(b.multiaddr)

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
export function publicAddressesFirst (a: Address, b: Address): -1 | 0 | 1 {
  const isAPrivate = isPrivate(a.multiaddr)
  const isBPrivate = isPrivate(b.multiaddr)

  if (isAPrivate && !isBPrivate) {
    return 1
  } else if (!isAPrivate && isBPrivate) {
    return -1
  }

  return 0
}

/**
 * Compare function for array.sort() that moves certified addresses to the start
 * of the array.
 */
export function certifiedAddressesFirst (a: Address, b: Address): -1 | 0 | 1 {
  if (a.isCertified && !b.isCertified) {
    return -1
  } else if (!a.isCertified && b.isCertified) {
    return 1
  }

  return 0
}

/**
 * Compare function for array.sort() that moves circuit relay addresses to the
 * end of the array.
 */
export function circuitRelayAddressesLast (a: Address, b: Address): -1 | 0 | 1 {
  const isACircuit = Circuit.exactMatch(a.multiaddr)
  const isBCircuit = Circuit.exactMatch(b.multiaddr)

  if (isACircuit && !isBCircuit) {
    return 1
  } else if (!isACircuit && isBCircuit) {
    return -1
  }

  return 0
}

export function defaultAddressSorter (addresses: Address[]): Address[] {
  return addresses
    .sort(reliableTransportsFirst)
    .sort(certifiedAddressesFirst)
    .sort(circuitRelayAddressesLast)
    .sort(publicAddressesFirst)
    .sort(loopbackAddressLast)
}
