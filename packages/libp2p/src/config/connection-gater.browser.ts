import { isPrivateIp } from '@libp2p/utils/private-ip'
import type { ConnectionGater } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'

/**
 * Returns a connection gater that disallows dialling private addresses by
 * default. Browsers are severely limited in their resource usage so don't
 * waste time trying to dial undiallable addresses.
 */
export function connectionGater (gater: ConnectionGater = {}): ConnectionGater {
  return {
    denyDialPeer: async () => false,
    denyDialMultiaddr: async (multiaddr: Multiaddr) => {
      const tuples = multiaddr.stringTuples()

      if (tuples[0][0] === 4 || tuples[0][0] === 41) {
        return Boolean(isPrivateIp(`${tuples[0][1]}`))
      }

      return false
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
