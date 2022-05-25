import mergeOptions from 'merge-options'
import { dnsaddrResolver } from '@multiformats/multiaddr/resolvers'
import * as Constants from './constants.js'
import { AGENT_VERSION } from './identify/consts.js'
import * as RelayConstants from './circuit/constants.js'
import { publicAddressesFirst } from '@libp2p/utils/address-sort'
import { FaultTolerance } from './transport-manager.js'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { Libp2pInit } from './index.js'
import { codes, messages } from './errors.js'
import errCode from 'err-code'
import type { RecursivePartial } from '@libp2p/interfaces'

const DefaultConfig: Partial<Libp2pInit> = {
  addresses: {
    listen: [],
    announce: [],
    noAnnounce: [],
    announceFilter: (multiaddrs: Multiaddr[]) => multiaddrs
  },
  connectionManager: {
    maxConnections: 300,
    minConnections: 50,
    autoDial: true,
    autoDialInterval: 10000,
    maxParallelDials: Constants.MAX_PARALLEL_DIALS,
    maxDialsPerPeer: Constants.MAX_PER_PEER_DIALS,
    dialTimeout: Constants.DIAL_TIMEOUT,
    resolvers: {
      dnsaddr: dnsaddrResolver
    },
    addressSorter: publicAddressesFirst
  },
  connectionGater: {},
  transportManager: {
    faultTolerance: FaultTolerance.FATAL_ALL
  },
  metrics: {
    enabled: false,
    computeThrottleMaxQueueSize: 1000,
    computeThrottleTimeout: 2000,
    movingAverageIntervals: [
      60 * 1000, // 1 minute
      5 * 60 * 1000, // 5 minutes
      15 * 60 * 1000 // 15 minutes
    ],
    maxOldPeersRetention: 50
  },
  peerRouting: {
    refreshManager: {
      enabled: true,
      interval: 6e5,
      bootDelay: 10e3
    }
  },
  nat: {
    enabled: true,
    ttl: 7200,
    keepAlive: true
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
  identify: {
    protocolPrefix: 'ipfs',
    host: {
      agentVersion: AGENT_VERSION
    },
    timeout: 30000
  },
  ping: {
    protocolPrefix: 'ipfs'
  },
  fetch: {
    protocolPrefix: 'libp2p'
  }
}

export function validateConfig (opts: RecursivePartial<Libp2pInit>): Libp2pInit {
  const resultingOptions: Libp2pInit = mergeOptions(DefaultConfig, opts)

  if (resultingOptions.transports == null || resultingOptions.transports.length < 1) {
    throw errCode(new Error(messages.ERR_TRANSPORTS_REQUIRED), codes.ERR_TRANSPORTS_REQUIRED)
  }

  if (resultingOptions.connectionEncryption == null || resultingOptions.connectionEncryption.length === 0) {
    throw errCode(new Error(messages.CONN_ENCRYPTION_REQUIRED), codes.CONN_ENCRYPTION_REQUIRED)
  }

  if (resultingOptions.connectionProtector === null && globalThis.process?.env?.LIBP2P_FORCE_PNET != null) { // eslint-disable-line no-undef
    throw errCode(new Error(messages.ERR_PROTECTOR_REQUIRED), codes.ERR_PROTECTOR_REQUIRED)
  }

  return resultingOptions
}
