'use strict'

const debug = require('debug')
const log = Object.assign(debug('libp2p:peer-routing'), {
  error: debug('libp2p:peer-routing:err')
})
const errCode = require('err-code')
const {
  storeAddresses,
  uniquePeers,
  requirePeers
} = require('./content-routing/utils')

const merge = require('it-merge')
const { pipe } = require('it-pipe')
const first = require('it-first')
const drain = require('it-drain')
const filter = require('it-filter')
const {
  setDelayedInterval,
  clearDelayedInterval
// @ts-ignore module with no types
} = require('set-delayed-interval')

/**
 * @typedef {import('peer-id')} PeerId
 * @typedef {import('multiaddr').Multiaddr} Multiaddr
 * @typedef {import('libp2p-interfaces/src/peer-routing/types').PeerRouting} PeerRoutingModule
 */

/**
 * @typedef {Object} RefreshManagerOptions
 * @property {boolean} [enabled = true] - Whether to enable the Refresh manager
 * @property {number} [bootDelay = 6e5] - Boot delay to start the Refresh Manager (in ms)
 * @property {number} [interval = 10e3] - Interval between each Refresh Manager run (in ms)
 *
 * @typedef {Object} PeerRoutingOptions
 * @property {RefreshManagerOptions} [refreshManager]
 */

class PeerRouting {
  /**
   * @class
   * @param {import('./')} libp2p
   */
  constructor (libp2p) {
    this._peerId = libp2p.peerId
    this._peerStore = libp2p.peerStore
    /** @type {PeerRoutingModule[]} */
    this._routers = libp2p._modules.peerRouting || []

    // If we have the dht, add it to the available peer routers
    if (libp2p._dht && libp2p._config.dht.enabled) {
      this._routers.push(libp2p._dht)
    }

    this._refreshManagerOptions = libp2p._options.peerRouting.refreshManager

    this._findClosestPeersTask = this._findClosestPeersTask.bind(this)
  }

  /**
   * Start peer routing service.
   */
  start () {
    if (!this._routers.length || this._timeoutId || !this._refreshManagerOptions.enabled) {
      return
    }

    this._timeoutId = setDelayedInterval(
      this._findClosestPeersTask, this._refreshManagerOptions.interval, this._refreshManagerOptions.bootDelay
    )
  }

  /**
   * Recurrent task to find closest peers and add their addresses to the Address Book.
   */
  async _findClosestPeersTask () {
    try {
      // nb getClosestPeers adds the addresses to the address book
      await drain(this.getClosestPeers(this._peerId.id))
    } catch (err) {
      log.error(err)
    }
  }

  /**
   * Stop peer routing service.
   */
  stop () {
    clearDelayedInterval(this._timeoutId)
  }

  /**
   * Iterates over all peer routers in parallel to find the given peer.
   *
   * @param {PeerId} id - The id of the peer to find
   * @param {object} [options]
   * @param {number} [options.timeout] - How long the query should run
   * @returns {Promise<{ id: PeerId, multiaddrs: Multiaddr[] }>}
   */
  async findPeer (id, options) { // eslint-disable-line require-await
    if (!this._routers.length) {
      throw errCode(new Error('No peer routers available'), 'NO_ROUTERS_AVAILABLE')
    }

    if (id.toB58String() === this._peerId.toB58String()) {
      throw errCode(new Error('Should not try to find self'), 'ERR_FIND_SELF')
    }

    const output = await pipe(
      merge(
        ...this._routers.map(router => [router.findPeer(id, options)])
      ),
      (source) => filter(source, Boolean),
      // @ts-ignore findPeer resolves a Promise
      (source) => storeAddresses(source, this._peerStore),
      (source) => first(source)
    )

    if (output) {
      return output
    }

    throw errCode(new Error('not found'), 'NOT_FOUND')
  }

  /**
   * Attempt to find the closest peers on the network to the given key.
   *
   * @param {Uint8Array} key - A CID like key
   * @param {Object} [options]
   * @param {number} [options.timeout=30e3] - How long the query can take.
   * @returns {AsyncIterable<{ id: PeerId, multiaddrs: Multiaddr[] }>}
   */
  async * getClosestPeers (key, options = { timeout: 30e3 }) {
    if (!this._routers.length) {
      throw errCode(new Error('No peer routers available'), 'NO_ROUTERS_AVAILABLE')
    }

    yield * pipe(
      merge(
        ...this._routers.map(router => router.getClosestPeers(key, options))
      ),
      (source) => storeAddresses(source, this._peerStore),
      (source) => uniquePeers(source),
      (source) => requirePeers(source)
    )
  }
}

module.exports = PeerRouting
