'use strict'

const pTimes = require('p-times')

const multiaddr = require('multiaddr')
const PeerId = require('peer-id')
const PeerInfo = require('peer-info')

const Libp2p = require('../../../src')
const Peers = require('../../fixtures/peers')
const defaultOptions = require('../base-options.browser')

const listenAddr = multiaddr('/ip4/127.0.0.1/tcp/0')

/**
 * Create libp2p nodes.
 * @param {Object} [properties]
 * @param {Object} [properties.config]
 * @param {number} [properties.number] number of peers (default: 1).
 * @param {boolean} [properties.fixture] use fixture for peer-id generation (default: true)
 * @param {boolean} [properties.started] nodes should start (default: true)
 * @return {Promise<Array<Libp2p>>}
 */
async function createPeer ({ number = 1, fixture = true, started = true, config = defaultOptions } = {}) {
  const peerInfos = await createPeerInfo({ number, fixture })

  const peers = await pTimes(number, (i) => Libp2p.create({
    peerInfo: peerInfos[i],
    ...config
  }))

  if (started) {
    await Promise.all(peers.map((p) => {
      p.peerInfo.multiaddrs.add(listenAddr)
      return p.start()
    }))
  }

  return peers
}

/**
 * Create Peer-ids.
 * @param {Object} [properties]
 * @param {number} [properties.number] number of peers (default: 1).
 * @param {boolean} [properties.fixture] use fixture for peer-id generation (default: true)
 * @return {Promise<Array<PeerInfo>>}
 */
async function createPeerInfo ({ number = 1, fixture = true } = {}) {
  const peerIds = await createPeerId({ number, fixture })

  return pTimes(number, (i) => PeerInfo.create(peerIds[i]))
}

/**
 * Create Peer-ids.
 * @param {Object} [properties]
 * @param {number} [properties.number] number of peers (default: 1).
 * @param {boolean} [properties.fixture] use fixture for peer-id generation (default: true)
 * @return {Promise<Array<PeerId>>}
 */
function createPeerId ({ number = 1, fixture = true } = {}) {
  return pTimes(number, (i) => fixture
    ? PeerId.createFromJSON(Peers[i])
    : PeerId.create()
  )
}

module.exports.createPeer = createPeer
module.exports.createPeerInfo = createPeerInfo
module.exports.createPeerId = createPeerId
