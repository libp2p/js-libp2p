import type { ConnectionGater } from '@libp2p/interface'

/**
 * Returns a default connection gater implementation that allows everything
 */
export function connectionGater (gater: ConnectionGater = {}): ConnectionGater {
  return {
    denyDialPeer: async () => false,
    denyDialMultiaddr: async () => false,
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
