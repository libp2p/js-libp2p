import type { ConnectionGater } from '@libp2p/interface-connection-gater'

/**
 * Returns a default connection gater implementation that allows everything
 */
export function connectionGater (gater: ConnectionGater = {}): ConnectionGater {
  return {
    denyDialPeer: async () => await Promise.resolve(false),
    denyDialMultiaddr: async () => await Promise.resolve(false),
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
