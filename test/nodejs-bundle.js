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

    super({
      modules,
      peerInfo,
      peerBook
    })
  }
}

module.exports = Node
