'use strict'

const TCP = require('libp2p-tcp')
const spdy = require('libp2p-spdy')
const secio = require('libp2p-secio')
const libp2p = require('libp2p')

class Node extends libp2p {
  constructor ({ peerInfo, peerBook }) {
    const modules = {
      transport: [TCP],
      streamMuxer: [spdy],
      connEncryption: [secio]
    }

    peerInfo.multiaddrs.add('/ip4/127.0.0.1/tcp/0')

    super({
      modules,
      peerInfo,
      peerBook
    })
  }
}

module.exports = Node
