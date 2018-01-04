'use strict'

const PeerInfo = require('peer-info')
const Node = require('./browser-bundle')

function createNode (callback) {
  PeerInfo.create((err, peerInfo) => {
    if (err) {
      return callback(err)
    }

    const peerIdStr = peerInfo.id.toB58String()
    const ma = `/dns4/star-signal.cloud.ipfs.team/tcp/443/wss/p2p-webrtc-star/ipfs/${peerIdStr}`

    peerInfo.multiaddrs.add(ma)

    const node = new Node(peerInfo)

    node.idStr = peerIdStr
    callback(null, node)
  })
}

module.exports = createNode
