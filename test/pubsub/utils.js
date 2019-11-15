'use strict'

const Gossipsub = require('libp2p-gossipsub')
const { multicodec } = require('libp2p-gossipsub')
const Crypto = require('../../src/insecure/plaintext')
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
    pubsub: Gossipsub
  }
})

module.exports.subsystemOptions = subsystemOptions

module.exports.subsystemMulticodecs = [multicodec]
