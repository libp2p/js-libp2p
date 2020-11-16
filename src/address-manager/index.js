'use strict'

const debug = require('debug')
const log = debug('libp2p:addresses')
log.error = debug('libp2p:addresses:error')

const multiaddr = require('multiaddr')

/**
 * @typedef {Object} AddressManagerOptions
 * @property {Array<string>} [listen = []] - list of multiaddrs string representation to listen.
 * @property {Array<string>} [announce = []] - list of multiaddrs string representation to announce.
 */
class AddressManager {
  /**
   * Responsible for managing the peer addresses.
   * Peers can specify their listen and announce addresses.
   * The listen addresses will be used by the libp2p transports to listen for new connections,
   * while the announce addresses will be used for the peer addresses' to other peers in the network.
   *
   * @class
   * @param {AddressManagerOptions} [options]
   */
  constructor ({ listen = [], announce = [] } = {}) {
    this.listen = new Set(listen)
    this.announce = new Set(announce)
  }

  /**
   * Get peer listen multiaddrs.
   *
   * @returns {Array<multiaddr>}
   */
  getListenAddrs () {
    return Array.from(this.listen).map((a) => multiaddr(a))
  }

  /**
   * Get peer announcing multiaddrs.
   *
   * @returns {Array<multiaddr>}
   */
  getAnnounceAddrs () {
    return Array.from(this.announce).map((a) => multiaddr(a))
  }
}

module.exports = AddressManager
