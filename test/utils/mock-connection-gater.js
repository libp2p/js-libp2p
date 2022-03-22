'use strict'

function mockConnectionGater () {
  return {
    denyDialPeer: async () => Promise.resolve(false),
    denyDialMultiaddr: async () => Promise.resolve(false),
    denyInboundConnection: async () => Promise.resolve(false),
    denyOutboundConnection: async () => Promise.resolve(false),
    denyInboundEncryptedConnection: async () => Promise.resolve(false),
    denyOutboundEncryptedConnection: async () => Promise.resolve(false),
    denyInboundUpgradedConnection: async () => Promise.resolve(false),
    denyOutboundUpgradedConnection: async () => Promise.resolve(false),
    filterMultiaddrForPeer: async () => Promise.resolve(true)
  }
}

module.exports = {
  mockConnectionGater
}
