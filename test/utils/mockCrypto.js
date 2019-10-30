'use strict'

const PeerId = require('peer-id')
const Peers = require('../fixtures/peers')

module.exports = {
  protocol: '/insecure',
  secureInbound: (localPeer, stream) => {
    return {
      conn: stream,
      remotePeer: localPeer
    }
  },
  secureOutbound: async (localPeer, stream, remotePeer) => {
    // Crypto should always return a remotePeer
    if (!remotePeer) {
      remotePeer = await PeerId.createFromJSON(Peers[0])
    }
    return {
      conn: stream,
      remotePeer: remotePeer
    }
  }
}
