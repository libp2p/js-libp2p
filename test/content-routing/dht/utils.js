'use strict'

const KadDht = require('libp2p-kad-dht')
const { multicodec } = require('libp2p-kad-dht')
const Crypto = require('../../../src/insecure/plaintext')
const Muxer = require('libp2p-mplex')
const Transport = require('libp2p-tcp')

const mergeOptions = require('merge-options')

const baseOptions = {
  modules: {
    transport: [Transport],
    streamMuxer: [Muxer],
    connEncryption: [Crypto]
  }
}

module.exports.baseOptions = baseOptions

const subsystemOptions = mergeOptions(baseOptions, {
  modules: {
    dht: KadDht
  },
  config: {
    dht: {
      kBucketSize: 20,
      randomWalk: {
        enabled: true
      },
      enabled: true
    }
  }
})

module.exports.subsystemOptions = subsystemOptions
module.exports.subsystemMulticodecs = [multicodec]
