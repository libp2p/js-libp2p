'use strict'

const errCode = require('err-code')
const { messages, codes } = require('./errors')

const all = require('it-all')
const pAny = require('p-any')

/**
 * @typedef {import('peer-id')} PeerId
 * @typedef {import('multiaddr')} Multiaddr
 * @typedef {import('cids')} CID
 */

/**
 * @typedef {Object} GetData
 * @property {PeerId} from
 * @property {Uint8Array} val
 */

class ContentRouting {
  /**
   * @class
   * @param {import('./')} libp2p
   */
  constructor (libp2p) {
    this.libp2p = libp2p
    this.routers = libp2p._modules.contentRouting || []
    this.dht = libp2p._dht

    // If we have the dht, make it first
    if (this.dht) {
      this.routers.unshift(this.dht)
    }
  }

  /**
   * Iterates over all content routers in series to find providers of the given key.
   * Once a content router succeeds, iteration will stop.
   *
   * @param {CID} key - The CID key of the content to find
   * @param {object} [options]
   * @param {number} [options.timeout] - How long the query should run
   * @param {number} [options.maxNumProviders] - maximum number of providers to find
   * @returns {AsyncIterable<{ id: PeerId, multiaddrs: Multiaddr[] }>}
   */
  async * findProviders (key, options) {
    if (!this.routers.length) {
      throw errCode(new Error('No content this.routers available'), 'NO_ROUTERS_AVAILABLE')
    }

    const result = await pAny(
      this.routers.map(async (router) => {
        const provs = await all(router.findProviders(key, options))

        if (!provs || !provs.length) {
          throw errCode(new Error('not found'), 'NOT_FOUND')
        }
        return provs
      })
    )

    for (const peer of result) {
      yield peer
    }
  }

  /**
   * Iterates over all content routers in parallel to notify it is
   * a provider of the given key.
   *
   * @param {CID} key - The CID key of the content to find
   * @returns {Promise<void>}
   */
  async provide (key) {
    if (!this.routers.length) {
      throw errCode(new Error('No content routers available'), 'NO_ROUTERS_AVAILABLE')
    }

    await Promise.all(this.routers.map((router) => router.provide(key)))
  }

  /**
   * Store the given key/value pair in the DHT.
   *
   * @param {Uint8Array} key
   * @param {Uint8Array} value
   * @param {Object} [options] - put options
   * @param {number} [options.minPeers] - minimum number of peers required to successfully put
   * @returns {Promise<void>}
   */
  put (key, value, options) {
    if (!this.libp2p.isStarted() || !this.dht.isStarted) {
      throw errCode(new Error(messages.NOT_STARTED_YET), codes.DHT_NOT_STARTED)
    }

    return this.dht.put(key, value, options)
  }

  /**
   * Get the value to the given key.
   * Times out after 1 minute by default.
   *
   * @param {Uint8Array} key
   * @param {Object} [options] - get options
   * @param {number} [options.timeout] - optional timeout (default: 60000)
   * @returns {Promise<GetData>}
   */
  get (key, options) {
    if (!this.libp2p.isStarted() || !this.dht.isStarted) {
      throw errCode(new Error(messages.NOT_STARTED_YET), codes.DHT_NOT_STARTED)
    }

    return this.dht.get(key, options)
  }

  /**
   * Get the `n` values to the given key without sorting.
   *
   * @param {Uint8Array} key
   * @param {number} nVals
   * @param {Object} [options] - get options
   * @param {number} [options.timeout] - optional timeout (default: 60000)
   * @returns {Promise<GetData[]>}
   */
  async getMany (key, nVals, options) { // eslint-disable-line require-await
    if (!this.libp2p.isStarted() || !this.dht.isStarted) {
      throw errCode(new Error(messages.NOT_STARTED_YET), codes.DHT_NOT_STARTED)
    }

    return this.dht.getMany(key, nVals, options)
  }
}

module.exports = ContentRouting
