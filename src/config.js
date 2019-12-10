'use strict'

const mergeOptions = require('merge-options')

const DefaultConfig = {
  connectionManager: {
    minPeers: 25
  },
  metrics: {
    enabled: true
  },
  config: {
    dht: {
      enabled: false,
      kBucketSize: 20,
      randomWalk: {
        enabled: false, // disabled waiting for https://github.com/libp2p/js-libp2p-kad-dht/issues/86
        queriesPerPeriod: 1,
        interval: 300e3,
        timeout: 10e3
      }
    },
    peerDiscovery: {
      autoDial: true
    },
    pubsub: {
      enabled: true,
      emitSelf: true,
      signMessages: true,
      strictSigning: true
    },
    relay: {
      enabled: true,
      hop: {
        enabled: false,
        active: false
      }
    }
  }
}

module.exports.validate = (opts) => {
  opts = mergeOptions(DefaultConfig, opts)

  if (opts.modules.transport.length < 1) throw new Error("'options.modules.transport' must contain at least 1 transport")

  return opts
}
