import { WebSocketsSecure, WebSockets, DNS } from '@multiformats/multiaddr-matcher'
import type { Multiaddr } from '@multiformats/multiaddr'

export function all (multiaddrs: Multiaddr[]): Multiaddr[] {
  return multiaddrs.filter((ma) => {
    return WebSocketsSecure.exactMatch(ma) || WebSockets.exactMatch(ma)
  })
}

export function wss (multiaddrs: Multiaddr[]): Multiaddr[] {
  return multiaddrs.filter((ma) => {
    return WebSocketsSecure.exactMatch(ma)
  })
}

export function dnsWss (multiaddrs: Multiaddr[]): Multiaddr[] {
  return multiaddrs.filter((ma) => {
    return DNS.matches(ma) && WebSocketsSecure.exactMatch(ma)
  })
}

export function dnsWsOrWss (multiaddrs: Multiaddr[]): Multiaddr[] {
  return multiaddrs.filter((ma) => {
    return DNS.matches(ma) && (WebSocketsSecure.exactMatch(ma) || WebSockets.exactMatch(ma))
  })
}
