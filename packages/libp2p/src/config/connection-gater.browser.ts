import { isPrivate } from '@libp2p/utils'
import { WebSockets } from '@multiformats/multiaddr-matcher'
import type { ConnectionGater } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'

/**
 * Returns a connection gater that disallows dialling private addresses or
 * insecure websockets by default.
 *
 * Browsers are severely limited in their resource usage so don't waste time
 * trying to dial undialable addresses, and they also print verbose error
 * messages when making connections over insecure transports which causes
 * confusion.
 */
export function connectionGater (gater: ConnectionGater = {}): ConnectionGater {
  return {
    denyDialPeer: async () => false,
    denyDialMultiaddr: async (multiaddr: Multiaddr) => {
      // do not connect to insecure websockets by default
      if (WebSockets.matches(multiaddr)) {
        return true
      }

      // do not connect to private addresses by default
      return isPrivate(multiaddr)
    },
    denyInboundConnection: async () => false,
    denyOutboundConnection: async () => false,
    denyInboundEncryptedConnection: async () => false,
    denyOutboundEncryptedConnection: async () => false,
    denyInboundUpgradedConnection: async () => false,
    denyOutboundUpgradedConnection: async () => false,
    filterMultiaddrForPeer: async () => true,
    ...gater
  }
}
