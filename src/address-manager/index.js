'use strict'

const debug = require('debug')
const log = debug('libp2p:addresses')
log.error = debug('libp2p:addresses:error')

const multiaddr = require('multiaddr')

/**
 * Responsible for managing this peers addresses.
 * Peers can specify their listen, announce and noAnnounce addresses.
 * The listen addresses will be used by the libp2p transports to listen for new connections,
 * while the announce an noAnnounce addresses will be combined with the listen addresses for
 * address adverstising to other peers in the network.
 */
class AddressManager {
  /**
   * @class
   * @param {object} [options]
   * @param {Array<string>} [options.listen = []] - list of multiaddrs string representation to listen.
   * @param {Array<string>} [options.announce = []] - list of multiaddrs string representation to announce.
   * @param {Array<string>} [options.noAnnounce = []] - list of multiaddrs string representation to not announce.
   */
  constructor ({ listen = [], announce = [], noAnnounce = [] } = {}) {
    this.listen = new Set(listen)
    this.announce = new Set(announce)
    this.noAnnounce = new Set(noAnnounce)
  }

  /**
   * Get peer listen multiaddrs.
   *
   * @returns {Array<Multiaddr>}
   */
  getListenAddrs () {
    return Array.from(this.listen).map((a) => multiaddr(a))
  }

  /**
   * Get peer announcing multiaddrs.
   *
   * @returns {Array<Multiaddr>}
   */
  getAnnounceAddrs () {
    return Array.from(this.announce).map((a) => multiaddr(a))
  }

  /**
   * Get peer noAnnouncing multiaddrs.
   *
   * @returns {Array<Multiaddr>}
   */
  getNoAnnounceAddrs () {
    return Array.from(this.noAnnounce).map((a) => multiaddr(a))
  }
}

module.exports = AddressManager
