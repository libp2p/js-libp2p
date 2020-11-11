'use strict'

const errCode = require('err-code')
const debug = require('debug')
const log = debug('libp2p:peer-routing')
log.error = debug('libp2p:peer-routing:error')

const all = require('it-all')
const pAny = require('p-any')
const {
  setDelayedInterval,
  clearDelayedInterval
} = require('set-delayed-interval')

/**
 * Responsible for managing the usage of the available Peer Routing modules.
 */
class PeerRouting {
  /**
   * @class
   * @param {Libp2p} libp2p
   */
  constructor (libp2p) {
    this._peerId = libp2p.peerId
    this._peerStore = libp2p.peerStore
    this._routers = libp2p._modules.peerRouting || []

    // If we have the dht, make it first
    if (libp2p._dht) {
      this._routers.unshift(libp2p._dht)
    }

    this._options = libp2p._options.peerRouting

    this._findClosestPeersTask = this._findClosestPeersTask.bind(this)
  }

  /**
   * Start peer routing service.
   */
  start () {
    if (!this._routers.length || this._timeoutId || !this._options.enabled) {
      return
    }

    this._timeoutId = setDelayedInterval(
      this._findClosestPeersTask, this._options.interval, this._options.bootDelay
    )
  }

  /**
   * Recurrent task to find closest peers and add their addresses to the Address Book.
   */
  async _findClosestPeersTask () {
    try {
      for await (const { id, multiaddrs } of this.getClosestPeers(this._peerId.id)) {
        this._peerStore.addressBook.add(id, multiaddrs)
      }
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
   * Iterates over all peer routers in series to find the given peer.
   *
   * @param {string} id - The id of the peer to find
   * @param {object} [options]
   * @param {number} [options.timeout] - How long the query should run
   * @returns {Promise<{ id: PeerId, multiaddrs: Multiaddr[] }>}
   */
  async findPeer (id, options) { // eslint-disable-line require-await
    if (!this._routers.length) {
      throw errCode(new Error('No peer routers available'), 'NO_ROUTERS_AVAILABLE')
    }

    return pAny(this._routers.map(async (router) => {
      const result = await router.findPeer(id, options)

      // If we don't have a result, we need to provide an error to keep trying
      if (!result || Object.keys(result).length === 0) {
        throw errCode(new Error('not found'), 'NOT_FOUND')
      }

      return result
    }))
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

    const result = await pAny(
      this._routers.map(async (router) => {
        const peers = await all(router.getClosestPeers(key, options))

        if (!peers || !peers.length) {
          throw errCode(new Error('not found'), 'NOT_FOUND')
        }
        return peers
      })
    )

    for (const peer of result) {
      yield peer
    }
  }
}

module.exports = PeerRouting
