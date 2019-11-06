'use strict'

const PeerId = require('peer-id')
const PeerInfo = require('peer-info')

const Peers = require('../../fixtures/peers')

module.exports.createPeerInfo = async (length) => {
  const peers = await Promise.all(
    Array.from({ length })
      .map((_, i) => PeerId.create())
  )

  return peers.map((peer) => new PeerInfo(peer))
}

module.exports.createPeerInfoFromFixture = async (length) => {
  const peers = await Promise.all(
    Array.from({ length })
      .map((_, i) => PeerId.createFromJSON(Peers[i]))
  )

  return peers.map((peer) => new PeerInfo(peer))
}
