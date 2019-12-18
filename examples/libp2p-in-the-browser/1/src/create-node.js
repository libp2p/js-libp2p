'use strict'

const PeerInfo = require('peer-info')
const Node = require('./browser-node')

async function createNode() {
  const peerInfo = await PeerInfo.create()

  const peerIdStr = peerInfo.id.toB58String()
  const webrtcAddr = `/ip4/0.0.0.0/tcp/9090/wss/p2p-webrtc-star/p2p/${peerIdStr}`
  peerInfo.multiaddrs.add(webrtcAddr)

  const node = new Node({
    peerInfo
  })
  node.idStr = peerIdStr

  return node
}

module.exports = createNode
