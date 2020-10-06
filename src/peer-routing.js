'use strict'

const errCode = require('err-code')
const pAny = require('p-any')

module.exports = (node) => {
  const routers = node._modules.peerRouting || []

  // If we have the dht, make it first
  if (node._dht) {
    routers.unshift(node._dht)
  }

  return {
    /**
     * Iterates over all peer routers in series to find the given peer.
     *
     * @param {string} id - The id of the peer to find
     * @param {object} [options]
     * @param {number} [options.timeout] - How long the query should run
     * @returns {Promise<{ id: PeerId, multiaddrs: Multiaddr[] }>}
     */
    findPeer: async (id, options) => { // eslint-disable-line require-await
      if (!routers.length) {
        throw errCode(new Error('No peer routers available'), 'NO_ROUTERS_AVAILABLE')
      }

      return pAny(routers.map(async (router) => {
        const result = await router.findPeer(id, options)

        // If we don't have a result, we need to provide an error to keep trying
        if (!result || Object.keys(result).length === 0) {
          throw errCode(new Error('not found'), 'NOT_FOUND')
        }

        return result
      }))
    }
  }
}
