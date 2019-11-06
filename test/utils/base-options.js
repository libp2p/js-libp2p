'use strict'

const Transport = require('libp2p-tcp')
const Muxer = require('libp2p-mplex')
const mockCrypto = require('../utils/mockCrypto')

module.exports = {
  modules: {
    transport: [Transport],
    streamMuxer: [Muxer],
    connEncryption: [mockCrypto]
  }
}
