'use strict'

const Libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const MPLEX = require('libp2p-mplex')
const SECIO = require('libp2p-secio')
const fs = require('fs')
const Protector = require('libp2p-pnet')

/**
 * Options for the libp2p bundle
 * @typedef {Object} libp2pBundle~options
 * @property {PeerInfo} peerInfo - The PeerInfo of the IPFS node
 * @property {PeerBook} peerBook - The PeerBook of the IPFS node
 * @property {Object} config - The config of the IPFS node
 * @property {Object} options - The options given to the IPFS node
 */

/**
 * privateLibp2pBundle returns a libp2p bundle function that will use the swarm
 * key at the given `swarmKeyPath` to create the Protector
 *
 * @param {string} swarmKeyPath The path to our swarm key
 * @returns {libp2pBundle} Returns a libp2pBundle function for use in IPFS creation
 */
const privateLibp2pBundle = (swarmKeyPath) => {
  /**
   * This is the bundle we will use to create our fully customized libp2p bundle.
   *
   * @param {libp2pBundle~options} opts The options to use when generating the libp2p node
   * @returns {Libp2p} Our new libp2p node
   */
  const libp2pBundle = (opts) => {
    // Set convenience variables to clearly showcase some of the useful things that are available
    const peerInfo = opts.peerInfo
    const peerBook = opts.peerBook

    // Build and return our libp2p node
    return new Libp2p({
      peerInfo,
      peerBook,
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

  return libp2pBundle
}

module.exports = privateLibp2pBundle
