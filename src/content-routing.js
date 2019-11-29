'use strict'

const all = require('async-iterator-all')
const pAny = require('p-any')
const errCode = require('err-code')

module.exports = (node) => {
  const routers = node._modules.contentRouting || []

  // If we have the dht, make it first
  if (node._dht) {
    routers.unshift(node._dht._dht)
  }

  return {
    /**
     * Iterates over all content routers in series to find providers of the given key.
     * Once a content router succeeds, iteration will stop.
     *
     * @param {CID} key The CID key of the content to find
     * @param {object} [options]
     * @param {number} [options.timeout] How long the query should run
     * @param {number} [options.maxNumProviders] - maximum number of providers to find
     * @returns {AsyncIterable<PeerInfo>}
     */
    async * findProviders (key, options) {
      if (!routers.length) {
        throw errCode(new Error('No content routers available'), 'NO_ROUTERS_AVAILABLE')
      }

      const result = await pAny(
        routers.map(async (router) => {
          const provs = await all(router.findProviders(key, options))

          if (!provs || !provs.length) {
            throw errCode(new Error('not found'), 'NOT_FOUND')
          }
          return provs
        })
      )

      for (const pInfo of result) {
        yield pInfo
      }
    },

    /**
     * Iterates over all content routers in parallel to notify it is
     * a provider of the given key.
     *
     * @param {CID} key The CID key of the content to find
     * @returns {Promise<void>}
     */
    async provide (key) { // eslint-disable-line require-await
      if (!routers.length) {
        throw errCode(new Error('No content routers available'), 'NO_ROUTERS_AVAILABLE')
      }

      return Promise.all(routers.map((router) => router.provide(key)))
    }
  }
}
