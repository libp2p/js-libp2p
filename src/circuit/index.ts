'use strict'

const debug = require('debug')
const log = Object.assign(debug('libp2p:relay'), {
  error: debug('libp2p:relay:err')
})
const { codes } = require('./../errors')
const {
  setDelayedInterval,
  clearDelayedInterval
// @ts-ignore set-delayed-interval does not export types
} = require('set-delayed-interval')

const AutoRelay = require('./auto-relay')
const { namespaceToCid } = require('./utils')
const {
  RELAY_RENDEZVOUS_NS
} = require('./constants')

/**
 * @typedef {import('../')} Libp2p
 *
 * @typedef {Object} RelayAdvertiseOptions
 * @property {number} [bootDelay = ADVERTISE_BOOT_DELAY]
 * @property {boolean} [enabled = true]
 * @property {number} [ttl = ADVERTISE_TTL]
 *
 * @typedef {Object} HopOptions
 * @property {boolean} [enabled = false]
 * @property {boolean} [active = false]
 *
 * @typedef {Object} AutoRelayOptions
 * @property {number} [maxListeners = 2] - maximum number of relays to listen.
 * @property {boolean} [enabled = false]
 */

class Relay {
  /**
   * Creates an instance of Relay.
   *
   * @class
   * @param {Libp2p} libp2p
   */
  constructor (libp2p) {
    this._libp2p = libp2p
    this._options = {
      ...libp2p._config.relay
    }

    // Create autoRelay if enabled
    this._autoRelay = this._options.autoRelay.enabled && new AutoRelay({ libp2p, ...this._options.autoRelay })

    this._advertiseService = this._advertiseService.bind(this)
  }

  /**
   * Start Relay service.
   *
   * @returns {void}
   */
  start () {
    // Advertise service if HOP enabled
    const canHop = this._options.hop.enabled

    if (canHop && this._options.advertise.enabled) {
      this._timeout = setDelayedInterval(
        this._advertiseService, this._options.advertise.ttl, this._options.advertise.bootDelay
      )
    }
  }

  /**
   * Stop Relay service.
   *
   * @returns {void}
   */
  stop () {
    clearDelayedInterval(this._timeout)
  }

  /**
   * Advertise hop relay service in the network.
   *
   * @returns {Promise<void>}
   */
  async _advertiseService () {
    try {
      const cid = await namespaceToCid(RELAY_RENDEZVOUS_NS)
      await this._libp2p.contentRouting.provide(cid)
    } catch (/** @type {any} */ err) {
      if (err.code === codes.ERR_NO_ROUTERS_AVAILABLE) {
        log.error('a content router, such as a DHT, must be provided in order to advertise the relay service', err)
        // Stop the advertise
        this.stop()
      } else {
        log.error(err)
      }
    }
  }
}

module.exports = Relay
