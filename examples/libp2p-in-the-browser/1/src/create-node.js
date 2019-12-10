'use strict'

const PeerInfo = require('peer-info')
const Node = require('./browser-node')

async function createNode() {
  const peerInfo = await PeerInfo.create()

  const peerIdStr = peerInfo.id.toB58String()
  const webrtcAddr = `/dns4/star-signal.cloud.ipfs.team/tcp/443/wss/p2p-webrtc-star/p2p/${peerIdStr}`
  peerInfo.multiaddrs.add(webrtcAddr)

  const node = new Node({
    peerInfo
  })
  node.idStr = peerIdStr

  return node
}

module.exports = createNode
