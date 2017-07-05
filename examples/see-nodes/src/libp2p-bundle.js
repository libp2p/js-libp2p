'use strict'

const WebRTCStar = require('libp2p-webrtc-star')
const multiplex = require('libp2p-multiplex')
const spdy = require('libp2p-spdy')
const secio = require('libp2p-secio')
const libp2p = require('../../..')

class Node extends libp2p {
  constructor (peerInfo, peerBook, options) {
    options = options || {}
    const wstar = new WebRTCStar()

    const modules = {
      transport: [wstar],
      connection: {
        muxer: [multiplex, spdy],
        crypto: [secio]
      },
      discovery: [wstar.discovery]
    }

    super(modules, peerInfo, peerBook, options)
  }
}

module.exports = Node
