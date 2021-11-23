'use strict'

const errCode = require('err-code')
const { messages, codes } = require('../errors')
const {
  storeAddresses,
  uniquePeers,
  requirePeers,
  maybeLimitSource,
  raceToSuccess
} = require('./utils')

const merge = require('it-merge')
const { pipe } = require('it-pipe')

/**
 * @typedef {import('peer-id')} PeerId
 * @typedef {import('multiaddr').Multiaddr} Multiaddr
 * @typedef {import('multiformats/cid').CID} CID
 * @typedef {import('libp2p-interfaces/src/content-routing/types').ContentRouting} ContentRoutingModule
 * @typedef {import('libp2p-interfaces/src/value-store/types').ValueStore} ValueStoreModule
 * @typedef {import('libp2p-interfaces/src/value-store/types').GetValueResult} GetData
 */

class ContentRouting {
  /**
   * @class
   * @param {import('..')} libp2p
   */
  constructor (libp2p) {
    this.libp2p = libp2p
    /** @type {ContentRoutingModule[]} */
    this.routers = libp2p._modules.contentRouting || []
    /** @type {ValueStoreModule[]} */
    this.valueStores = libp2p._modules.valueStorage || []
    this.dht = libp2p._dht

    // If we have the dht, add it to the available content routers and value stores
    if (this.dht && libp2p._config.dht.enabled) {
      this.routers.push(this.dht)
      if (!this.valueStores.includes(this.dht)) {
        this.valueStores.push(this.dht)
      }
    }
  }

  /**
   * Iterates over all content routers in parallel to find providers of the given key.
   *
   * @param {CID} key - The CID key of the content to find
   * @param {object} [options]
   * @param {number} [options.timeout] - How long the query should run
   * @param {number} [options.maxNumProviders] - maximum number of providers to find
   * @returns {AsyncIterable<{ id: PeerId, multiaddrs: Multiaddr[] }>}
   */
  async * findProviders (key, options = {}) {
    if (!this.routers.length) {
      throw errCode(new Error('No content this.routers available'), 'NO_ROUTERS_AVAILABLE')
    }

    yield * pipe(
      merge(
        ...this.routers.map(router => router.findProviders(key, options))
      ),
      (source) => storeAddresses(source, this.libp2p.peerStore),
      (source) => uniquePeers(source),
      (source) => maybeLimitSource(source, options.maxNumProviders),
      (source) => requirePeers(source)
    )
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
   * Store the given key/value pair in the DHT and/or configured ValueStore.
   *
   * @param {Uint8Array} key
   * @param {Uint8Array} value
   * @param {Object} [options] - put options
   * @param {number} [options.minPeers] - minimum number of peers required to successfully put
   * @returns {Promise<void>}
   */
  async put (key, value, options) {
    if (!this.libp2p.isStarted()) {
      throw errCode(new Error(messages.NOT_STARTED_YET), codes.ERR_NODE_NOT_STARTED)
    }

    if (this.libp2p._config.dht.enabled && !this.dht.isStarted) {
      throw errCode(new Error(messages.NOT_STARTED_YET), codes.DHT_NOT_STARTED)
    }

    if (this.valueStores.length === 0) {
      throw errCode(new Error(messages.VALUE_STORE_REQUIRED), codes.ERR_VALUE_STORE_UNAVAILABLE)
    }

    const promises = []
    for (const store of this.valueStores) {
      promises.push(store.put(key, value, options))
    }

    await Promise.all(promises)
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
    if (!this.libp2p.isStarted()) {
      throw errCode(new Error(messages.NOT_STARTED_YET), codes.ERR_NODE_NOT_STARTED)
    }

    if (this.libp2p._config.dht.enabled && !this.dht.isStarted) {
      throw errCode(new Error(messages.NOT_STARTED_YET), codes.DHT_NOT_STARTED)
    }

    if (this.valueStores.length === 0) {
      throw errCode(new Error(messages.VALUE_STORE_REQUIRED), codes.ERR_VALUE_STORE_UNAVAILABLE)
    }

    const promises = []
    for (const store of this.valueStores) {
      promises.push(store.get(key, options))
    }

    return raceToSuccess(promises)
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
