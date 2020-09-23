'use strict'

const mergeOptions = require('merge-options')
const Constants = require('./constants')
const RelayConstants = require('./circuit/constants')

const { FaultTolerance } = require('./transport-manager')

const DefaultConfig = {
  addresses: {
    listen: [],
    announce: [],
    noAnnounce: []
  },
  connectionManager: {
    minConnections: 25
  },
  transportManager: {
    faultTolerance: FaultTolerance.FATAL_ALL
  },
  dialer: {
    maxParallelDials: Constants.MAX_PARALLEL_DIALS,
    maxDialsPerPeer: Constants.MAX_PER_PEER_DIALS,
    dialTimeout: Constants.DIAL_TIMEOUT
  },
  metrics: {
    enabled: false
  },
  peerStore: {
    persistence: false,
    threshold: 5
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
      advertise: {
        bootDelay: RelayConstants.ADVERTISE_BOOT_DELAY,
        enabled: true,
        ttl: RelayConstants.ADVERTISE_TTL
      },
      hop: {
        enabled: false,
        active: false
      },
      autoRelay: {
        enabled: false,
        maxListeners: 2
      }
    },
    transport: {}
  }
}

module.exports.validate = (opts) => {
  opts = mergeOptions(DefaultConfig, opts)

  if (opts.modules.transport.length < 1) throw new Error("'options.modules.transport' must contain at least 1 transport")

  return opts
}
