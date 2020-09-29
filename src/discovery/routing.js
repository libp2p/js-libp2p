'use strict'

const { namespaceToCid } = require('./utils')

/**
 * RoutingDiscovery is an implementation of service discovery
 * using ContentRouting. Namespaces represent services supported by other nodes.
 * @param {Libp2p} libp2p
 */
module.exports = libp2p => {
  const contentRouting = libp2p.contentRouting
  const isEnabled = !!contentRouting.routers.length

  return {
    isEnabled,
    /**
     * Advertise services on the network using content routing modules.
     * @param {string} namespace
     * @param {object} [options]
     * @returns {Promise<void>}
     */
    async advertise(namespace, options) {
      const cid = await namespaceToCid(namespace)

      // TODO: options?
      await contentRouting.provide(cid)
    },
    /**
     * Discover peers providing a given service.
     * @param {string} namespace
     * @param {object} [options]
     * @param {number} [options.limit] limit of peers to discover
     * @returns {AsyncIterable<{ id: PeerId, multiaddrs: Multiaddr[] }>}
     */
    async * findPeers(namespace, options = {}) {
      const cid = await namespaceToCid(namespace)
      const providerOptions = {
        maxNumProviders: options.limit
      }

      // TODO: Abortables + options
      for await (const peer of contentRouting.findProviders(cid, providerOptions)) {
        yield peer
      }
    }
  }
}
