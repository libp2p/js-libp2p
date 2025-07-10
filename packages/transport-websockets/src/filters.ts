import { WebSocketsSecure, WebSockets, DNS } from '@multiformats/multiaddr-matcher'
import type { Multiaddr } from '@multiformats/multiaddr'

/**
 * @deprecated Configure this globally by passing a `connectionGater` to `createLibp2p` with a `denyDialMultiaddr` method that returns `false`
 */
export function all (multiaddrs: Multiaddr[]): Multiaddr[] {
  return multiaddrs.filter((ma) => {
    return WebSocketsSecure.exactMatch(ma) || WebSockets.exactMatch(ma)
  })
}

/**
 * @deprecated Configure this globally by passing a `connectionGater` to `createLibp2p`
 */
export function wss (multiaddrs: Multiaddr[]): Multiaddr[] {
  return multiaddrs.filter((ma) => {
    return WebSocketsSecure.exactMatch(ma)
  })
}

/**
 * @deprecated Configure this globally by passing a `connectionGater` to `createLibp2p`
 */
export function dnsWss (multiaddrs: Multiaddr[]): Multiaddr[] {
  return multiaddrs.filter((ma) => {
    return DNS.matches(ma) && WebSocketsSecure.exactMatch(ma)
  })
}

/**
 * @deprecated Configure this globally by passing a `connectionGater` to `createLibp2p`
 */
export function dnsWsOrWss (multiaddrs: Multiaddr[]): Multiaddr[] {
  return multiaddrs.filter((ma) => {
    return DNS.matches(ma) && (WebSocketsSecure.exactMatch(ma) || WebSockets.exactMatch(ma))
  })
}
