'use strict'

const debug = require('debug')
const log = debug('libp2p:relay')
log.error = debug('libp2p:relay:error')

const AutoRelay = require('./auto-relay')
const { namespaceToCid } = require('./utils')
const {
  ADVERTISE_BOOT_DELAY,
  ADVERTISE_TTL,
  RELAY_RENDEZVOUS_NS
} = require('./constants')

class Relay {
  /**
   * Creates an instance of Relay.
   *
   * @class
   * @param {Libp2p} libp2p
   */
  constructor (libp2p) {
    this._options = libp2p._config.relay
    this._libp2p = libp2p

    // Create autoRelay if enabled
    this._autoRelay = this._options.autoRelay.enabled && new AutoRelay({ libp2p, ...this._options.autoRelay })
  }

  /**
   * Start Relay service.
   * @returns {void}
   */
  start () {
    // Advertise service if HOP enabled
    const canHop = this._options.hop.enabled

    if (canHop) {
      this._timeout = setTimeout(() => {
        this._advertiseService()
      }, this._options.advertise.bootDelay || ADVERTISE_BOOT_DELAY)
    }
  }

  /**
   * Stop Relay service.
   * @returns {void}
   */
  stop () {
    clearTimeout(this._timeout)
  }

  /**
   * Advertise hop relay service in the network.
   * @returns {Promise<void>}
   */
  async _advertiseService () {
    try {
      const cid = await namespaceToCid(RELAY_RENDEZVOUS_NS)
      await this._libp2p.contentRouting.provide(cid)
    } catch (err) {
      if (err.code === 'NO_ROUTERS_AVAILABLE') {
        log('there are no routers configured to advertise hop relay service')
      } else {
        log.error(err)
      }
    }

    // Restart timeout
    this._timeout = setTimeout(() => {
      this._advertiseService()
    }, this._options.advertise.ttl || ADVERTISE_TTL)
  }
}

module.exports = Relay
