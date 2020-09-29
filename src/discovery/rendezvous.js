'use strict'

/**
 * RendezvousDiscovery is an implementation of service discovery
 * using Rendezvous. Namespaces represent services supported by other nodes.
 * @param {Libp2p} libp2p
 */
module.exports = libp2p => {
  const rendezvous = libp2p.rendezvous
  const isEnabled = !!rendezvous

  return {
    isEnabled,
    /**
     * Advertise services on the network using the rendezvous module.
     * @param {string} namespace
     * @param {object} [options]
     * @param {object} [options.ttl = 7200e3] registration ttl in ms (minimum 120)
     * @returns {Promise<number>}
     */
    advertise(namespace, options) {
      return rendezvous.register(namespace, options)
    },
    /**
     * Discover peers providing a given service.
     * @param {string} namespace
     * @param {object} [options]
     * @param {number} [options.limit] limit of peers to discover
     * @returns {AsyncIterable<{ signedPeerRecord: Envelope }>}
     */
    async * findPeers(namespace, options) {
      // TODO: Abortables + options
      for await (const peer of rendezvous.discover(namespace, options)) {
        yield peer
      }
    }
  }
}
