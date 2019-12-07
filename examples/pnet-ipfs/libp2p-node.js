'use strict'

const Libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const MPLEX = require('libp2p-mplex')
const SECIO = require('libp2p-secio')
const fs = require('fs')
const Protector = require('../../src/pnet')

/**
 * Options for the libp2p configuration
 * @typedef {Object} libp2p~options
 * @property {PeerInfo} peerInfo - The PeerInfo of the libp2p node
 * @property {Object} config - The config of the libp2p node
 * @property {Object} options - The options given to the libp2p node
 */

/**
 * privateLibp2p returns a libp2p node function that will use the swarm
 * key at the given `swarmKeyPath` to create the Protector
 *
 * @param {string} swarmKeyPath The path to our swarm key
 * @returns {libp2p} Returns a libp2p function for use in IPFS creation
 */
const privateLibp2p = (swarmKeyPath) => {
  /**
   * This is the configuration we will use to create our fully customized libp2p node.
   *
   * @param {libp2p~options} opts The options to use when generating the libp2p node
   * @returns {Libp2p} Our new libp2p node
   */
  const libp2p = (opts) => {
    // Set convenience variables to clearly showcase some of the useful things that are available
    const peerInfo = opts.peerInfo

    // Build and return our libp2p node
    return new Libp2p({
      peerInfo,
      modules: {
        transport: [TCP], // We're only using the TCP transport for this example
        streamMuxer: [MPLEX], // We're only using mplex muxing
        // Let's make sure to use identifying crypto in our pnet since the protector doesn't
        // care about node identity, and only the presence of private keys
        connEncryption: [SECIO],
        // Leave peer discovery empty, we don't want to find peers. We could omit the property, but it's
        // being left in for explicit readability.
        // We should explicitly dial pnet peers, or use a custom discovery service for finding nodes in our pnet
        peerDiscovery: [],
        connProtector: new Protector(fs.readFileSync(swarmKeyPath))
      }
    })
  }

  return libp2p
}

module.exports = privateLibp2p
