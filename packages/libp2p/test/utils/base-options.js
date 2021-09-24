'use strict'

const Transport = require('libp2p-tcp')
const Muxer = require('libp2p-mplex')
const { NOISE: Crypto } = require('@chainsafe/libp2p-noise')

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
    },
    nat: {
      enabled: false
    }
  }
}
