'use strict'

const Transport = require('libp2p-websockets')
const Muxer = require('libp2p-mplex')
const Crypto = require('../../src/insecure/plaintext')

module.exports = {
  modules: {
    transport: [Transport],
    streamMuxer: [Muxer],
    connEncryption: [Crypto]
  }
}
