'use strict'

const KadDht = require('libp2p-kad-dht')
const mergeOptions = require('merge-options')
const baseOptions = require('../utils/base-options')

module.exports.baseOptions = baseOptions

const routingOptions = mergeOptions(baseOptions, {
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

module.exports.routingOptions = routingOptions
