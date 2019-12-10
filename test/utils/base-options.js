'use strict'

const Transport = require('libp2p-tcp')
const Muxer = require('libp2p-mplex')
const Crypto = require('libp2p-secio')

module.exports = {
  modules: {
    transport: [Transport],
    streamMuxer: [Muxer],
    connEncryption: [Crypto]
  },
  config: {
    relay: {
      enabled: true,
      hop: {
        enabled: false
      }
    }
  }
}
