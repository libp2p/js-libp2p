'use strict'

const WebSocketStar = require('libp2p-websocket-star')
const spdy = require('libp2p-spdy')
const secio = require('libp2p-secio')
const libp2p = require('libp2p')

const { WS_STAR_MULTIADDR } = require('./constants')

class Node extends libp2p {
  constructor ({ peerInfo, peerBook }) {
    const starOpts = { id: peerInfo.id }
    const wsStar = new WebSocketStar(starOpts)

    peerInfo.multiaddrs.add(WS_STAR_MULTIADDR)

    const modules = {
      transport: [wsStar],
      streamMuxer: [spdy],
      connEncryption: [secio]
    }

    super({
      modules,
      peerInfo,
      peerBook
    })
  }
}

module.exports = Node
