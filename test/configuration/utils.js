'use strict'

const Pubsub = require('libp2p-interfaces/src/pubsub')
const { NOISE: Crypto } = require('libp2p-noise')
const Muxer = require('libp2p-mplex')
const Transport = require('libp2p-websockets')
const filters = require('libp2p-websockets/src/filters')
const transportKey = Transport.prototype[Symbol.toStringTag]

const { MULTIADDRS_WEBSOCKETS } = require('../fixtures/browser')
const relayAddr = MULTIADDRS_WEBSOCKETS[0]

const mergeOptions = require('merge-options')

const baseOptions = {
  modules: {
    transport: [Transport],
    streamMuxer: [Muxer],
    connEncryption: [Crypto]
  }
}

module.exports.baseOptions = baseOptions

class MockPubsub extends Pubsub {
  constructor (libp2p, options = {}) {
    super({
      debugName: 'mock-pubsub',
      multicodecs: '/mock-pubsub',
      libp2p,
      ...options
    })
  }
}

const pubsubSubsystemOptions = mergeOptions(baseOptions, {
  modules: {
    pubsub: MockPubsub
  },
  addresses: {
    listen: [`${relayAddr}/p2p-circuit`]
  },
  config: {
    transport: {
      [transportKey]: {
        filter: filters.all
      }
    }
  }
})

module.exports.pubsubSubsystemOptions = pubsubSubsystemOptions
