import type { ConnectionGater } from '@libp2p/interface-connection-gater'
import type { Multiaddr } from '@multiformats/multiaddr'
import isPrivate from 'private-ip'

/**
 * Returns a connection gater that disallows dialling private addresses by
 * default. Browsers are severely limited in their resource usage so don't
 * waste time trying to dial undiallable addresses.
 */
export function connectionGater (gater: ConnectionGater = {}): ConnectionGater {
  return {
    denyDialPeer: async () => await Promise.resolve(false),
    denyDialMultiaddr: async (multiaddr: Multiaddr) => {
      const tuples = multiaddr.stringTuples()

      if (tuples[0][0] === 4 || tuples[0][0] === 41) {
        return Boolean(isPrivate(`${tuples[0][1]}`))
      }

      return false
    },
    denyInboundConnection: async () => await Promise.resolve(false),
    denyOutboundConnection: async () => await Promise.resolve(false),
    denyInboundEncryptedConnection: async () => await Promise.resolve(false),
    denyOutboundEncryptedConnection: async () => await Promise.resolve(false),
    denyInboundUpgradedConnection: async () => await Promise.resolve(false),
    denyOutboundUpgradedConnection: async () => await Promise.resolve(false),
    filterMultiaddrForPeer: async () => await Promise.resolve(true),
    ...gater
  }
}
