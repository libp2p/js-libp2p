'use strict'

const { sortClosestPeers } = require('../../src/utils')

/**
 * Like `sortClosestPeers`, expect it takes and returns `PeerInfo`s
 *
 * @param {Array<PeerInfo>} peers
 * @param {Buffer} target
 * @param {function(Error, Array<PeerInfo>)} callback
 * @returns {void}
 */
exports.sortClosestPeerInfos = (peers, target, callback) => {
  sortClosestPeers(peers.map(peerInfo => peerInfo.id), target, (err, sortedPeerIds) => {
    if (err) return callback(err)

    const sortedPeerInfos = sortedPeerIds.map((peerId) => {
      return peers.find((peerInfo) => {
        return peerInfo.id.isEqual(peerId)
      })
    })

    callback(null, sortedPeerInfos)
  })
}
