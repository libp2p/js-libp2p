'use strict'

const Bootstrap = require('libp2p-bootstrap')
const Rendezvous = require('libp2p-rendezvous')

const mergeOptions = require('merge-options')
const { isNode } = require('ipfs-utils/src/env')
const baseOptions = require('../utils/base-options.browser')
const { MULTIADDRS_WEBSOCKETS } = require('../fixtures/browser')

module.exports.baseOptions = baseOptions

module.exports.listenAddrs = isNode
  ? ['/ip4/127.0.0.1/tcp/0/ws'] : [`${MULTIADDRS_WEBSOCKETS[0]}/p2p-circuit`]

module.exports.rendezvousClientOptions = mergeOptions(baseOptions, {
  modules: {
    rendezvous: Rendezvous,
    peerDiscovery: [Bootstrap]
  },
  config: {
    rendezvous: {
      server: {
        enabled: false
      }
    }
  }
})

module.exports.rendezvousServerOptions = mergeOptions(baseOptions, {
  modules: {
    rendezvous: Rendezvous
  },
  config: {
    rendezvous: {
      server: {
        enabled: true
      }
    }
  }
})
