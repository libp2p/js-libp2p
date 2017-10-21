'use strict'

const Libp2p = require('libp2p')
const secio = require('libp2p-secio')

class TestNode extends Libp2p {
  constructor (peerInfo, transports, muxer, options) {
    options = options || {}

    const modules = {
      transport: transports,
      connection: {
        muxer: [muxer],
        crypto: options.isCrypto ? [secio] : null
      },
      discovery: []
    }
    super(modules, peerInfo, null, options)
  }
}

module.exports = TestNode
