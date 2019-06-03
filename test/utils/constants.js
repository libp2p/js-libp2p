'use strict'

const PeerId = require('peer-id')
const PeerInfo = require('peer-info')
const nextTick = require('async/nextTick')
const peerJSON = require('../fixtures/test-peer')
const multiaddr = require('multiaddr')

let peerRelay = null

/**
 * Creates a `PeerInfo` that can be used across testing. Once the
 * relay `PeerInfo` has been requested, it will be reused for each
 * additional request.
 *
 * This is currently being used to create a relay on test bootstrapping
 * so that it can be used by browser nodes during their test suite. This
 * is necessary for running a TCP node during browser tests.
 * @private
 * @param {function(error, PeerInfo)} callback
 * @returns {void}
 */
module.exports.getPeerRelay = (callback) => {
  if (peerRelay) return nextTick(callback, null, peerRelay)

  PeerId.createFromJSON(peerJSON, (err, peerId) => {
    if (err) {
      return callback(err)
    }
    peerRelay = new PeerInfo(peerId)

    peerRelay.multiaddrs.add('/ip4/127.0.0.1/tcp/9200/ws')
    peerRelay.multiaddrs.add('/ip4/127.0.0.1/tcp/9245')

    callback(null, peerRelay)
  })
}

module.exports.WS_STAR_MULTIADDR = multiaddr('/ip4/127.0.0.1/tcp/14444/ws/p2p-websocket-star/')
module.exports.WS_RENDEZVOUS_MULTIADDR = multiaddr('/ip4/127.0.0.1/tcp/14444/wss')
