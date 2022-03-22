'use strict'

const mergeOptions = require('merge-options')
// @ts-ignore no types in multiaddr path
const { dnsaddrResolver } = require('multiaddr/src/resolvers')

const Constants = require('./constants')
const { AGENT_VERSION } = require('./identify/consts')
const RelayConstants = require('./circuit/constants')

const { publicAddressesFirst } = require('libp2p-utils/src/address-sort')
const { FaultTolerance } = require('./transport-manager')

/**
 * @typedef {import('multiaddr').Multiaddr} Multiaddr
 * @typedef {import('./types').ConnectionGater} ConnectionGater
 * @typedef {import('.').Libp2pOptions} Libp2pOptions
 * @typedef {import('.').constructorOptions} constructorOptions
 */

const DefaultConfig = {
  addresses: {
    listen: [],
    announce: [],
    noAnnounce: [],
    announceFilter: (/** @type {Multiaddr[]} */ multiaddrs) => multiaddrs
  },
  connectionManager: {
    minConnections: 25
  },
  connectionGater: /** @type {ConnectionGater} */ {},
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
  host: {
    agentVersion: AGENT_VERSION
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
    protocolPrefix: 'ipfs',
    dht: {
      enabled: false,
      kBucketSize: 20
    },
    nat: {
      enabled: true,
      ttl: 7200,
      keepAlive: true,
      gateway: null,
      externalIp: null,
      pmp: {
        enabled: false
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

/**
 * @param {Libp2pOptions} opts
 * @returns {DefaultConfig & Libp2pOptions & constructorOptions}
 */
module.exports.validate = (opts) => {
  /** @type {DefaultConfig & Libp2pOptions & constructorOptions} */
  const resultingOptions = mergeOptions(DefaultConfig, opts)

  if (resultingOptions.modules.transport.length < 1) throw new Error("'options.modules.transport' must contain at least 1 transport")

  return resultingOptions
}
