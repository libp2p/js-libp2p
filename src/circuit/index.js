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
    this._libp2p = libp2p
    this._options = {
      advertise: {
        bootDelay: ADVERTISE_BOOT_DELAY,
        enabled: true,
        ttl: ADVERTISE_TTL,
        ...libp2p._config.relay.advertise
      },
      ...libp2p._config.relay
    }

    // Create autoRelay if enabled
    this._autoRelay = this._options.autoRelay.enabled && new AutoRelay({ libp2p, ...this._options.autoRelay })
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
      this._timeout = setTimeout(() => {
        this._advertiseService()
      }, this._options.advertise.bootDelay)
    }
  }

  /**
   * Stop Relay service.
   *
   * @returns {void}
   */
  stop () {
    clearTimeout(this._timeout)
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
    } catch (err) {
      if (err.code === 'NO_ROUTERS_AVAILABLE') {
        log.error('a content router, such as a DHT, must be provided in order to advertise the relay service', err)
        // Stop the advertise
        this.stop()
      } else {
        log.error(err)
      }

      return
    }

    // Restart timeout
    this._timeout = setTimeout(() => {
      this._advertiseService()
    }, this._options.advertise.ttl)
  }
}

module.exports = Relay
