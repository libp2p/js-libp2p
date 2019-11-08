'use strict'

const PeerId = require('peer-id')
const PeerInfo = require('peer-info')

const Peers = require('../../fixtures/peers')

 async function createPeerInfo (length) {
  const peers = await Promise.all(
    Array.from({ length })
      .map((_, i) => PeerId.create())
  )

  return peers.map((peer) => new PeerInfo(peer))
}

function createPeerIdsFromFixture (length) {
  return Promise.all(
    Array.from({ length })
      .map((_, i) => PeerId.createFromJSON(Peers[i]))
  )
}

async function createPeerInfoFromFixture (length) {
  const peers = await createPeerIdsFromFixture(length)

  return peers.map((peer) => new PeerInfo(peer))
}

module.exports.createPeerInfo = createPeerInfo
module.exports.createPeerIdsFromFixture = createPeerIdsFromFixture
module.exports.createPeerInfoFromFixture = createPeerInfoFromFixture
