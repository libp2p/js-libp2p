'use strict'

const Libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const MPLEX = require('libp2p-mplex')
const SECIO = require('libp2p-secio')
const { NOISE } = require('libp2p-noise')
const Protector = require('libp2p/src/pnet')

/**
 * privateLibp2pNode returns a libp2p node function that will use the swarm
 * key with the given `swarmKey` to create the Protector
 *
 * @param {Buffer} swarmKey
 * @returns {Promise<libp2p>} Returns a libp2pNode function for use in IPFS creation
 */
const privateLibp2pNode = async (swarmKey) => {
  const node = await Libp2p.create({
    addresses: {
      listen: ['/ip4/0.0.0.0/tcp/0']
    },
    modules: {
      transport: [TCP], // We're only using the TCP transport for this example
      streamMuxer: [MPLEX], // We're only using mplex muxing
      // Let's make sure to use identifying crypto in our pnet since the protector doesn't
      // care about node identity, and only the presence of private keys
      connEncryption: [NOISE, SECIO],
      // Leave peer discovery empty, we don't want to find peers. We could omit the property, but it's
      // being left in for explicit readability.
      // We should explicitly dial pnet peers, or use a custom discovery service for finding nodes in our pnet
      peerDiscovery: [],
      connProtector: new Protector(swarmKey)
    }
  })

  return node
}

module.exports = privateLibp2pNode
