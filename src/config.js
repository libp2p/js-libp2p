'use strict'

const mergeOptions = require('merge-options')
const { dnsaddrResolver } = require('multiaddr/src/resolvers')

const Constants = require('./constants')
const RelayConstants = require('./circuit/constants')

const { publicAddressesFirst } = require('libp2p-utils/src/address-sort')
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
    dialTimeout: Constants.DIAL_TIMEOUT,
    resolvers: {
      dnsaddr: dnsaddrResolver
    },
    addressSorter: publicAddressesFirst
  },
  metrics: {
    enabled: false
  },
  peerStore: {
    persistence: false,
    threshold: 5
  },
  peerRouting: {
    refreshManager: {
      enabled: true,
      interval: 6e5,
      bootDelay: 10e3
    }
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
      enabled: true
    },
    relay: {
      enabled: true,
      advertise: {
        bootDelay: RelayConstants.ADVERTISE_BOOT_DELAY,
        enabled: false,
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
