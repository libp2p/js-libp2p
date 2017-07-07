'use strict'

const TCP = require('libp2p-tcp')
const spdy = require('libp2p-spdy')
const secio = require('libp2p-secio')
const libp2p = require('libp2p')

class Node extends libp2p {
  constructor (peerInfo, peerBook, options) {
    options = options || {}

    const modules = {
      transport: [new TCP()],
      connection: {
        muxer: spdy,
        crypto: [ secio ]
      }
    }

    super(modules, peerInfo, peerBook, options)
  }
}

module.exports = Node
