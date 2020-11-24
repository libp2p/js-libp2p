'use strict'

const Transport = require('libp2p-websockets')
const filters = require('libp2p-websockets/src/filters')
const Muxer = require('libp2p-mplex')
const { NOISE: Crypto } = require('libp2p-noise')

const transportKey = Transport.prototype[Symbol.toStringTag]

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
    transport: {
      [transportKey]: {
        filter: filters.all
      }
    }
  }
}
