'use strict'

const { EventEmitter } = require('events')
const { Multiaddr } = require('multiaddr')
const PeerId = require('peer-id')

/**
 * @typedef {Object} AddressManagerOptions
 * @property {string[]} [listen = []] - list of multiaddrs string representation to listen.
 * @property {string[]} [announce = []] - list of multiaddrs string representation to announce.
 */

/**
 * @fires AddressManager#change:addresses Emitted when a addresses change.
 */
class AddressManager extends EventEmitter {
  /**
   * Responsible for managing the peer addresses.
   * Peers can specify their listen and announce addresses.
   * The listen addresses will be used by the libp2p transports to listen for new connections,
   * while the announce addresses will be used for the peer addresses' to other peers in the network.
   *
   * @class
   * @param {PeerId} peerId - The Peer ID of the node
   * @param {object} [options]
   * @param {Array<string>} [options.listen = []] - list of multiaddrs string representation to listen.
   * @param {Array<string>} [options.announce = []] - list of multiaddrs string representation to announce.
   */
  constructor (peerId, { listen = [], announce = [] } = {}) {
    super()

    this.peerId = peerId
    this.listen = new Set(listen.map(ma => ma.toString()))
    this.announce = new Set(announce.map(ma => ma.toString()))
    this.observed = new Set()
  }

  /**
   * Get peer listen multiaddrs.
   *
   * @returns {Multiaddr[]}
   */
  getListenAddrs () {
    return Array.from(this.listen).map((a) => new Multiaddr(a))
  }

  /**
   * Get peer announcing multiaddrs.
   *
   * @returns {Multiaddr[]}
   */
  getAnnounceAddrs () {
    return Array.from(this.announce).map((a) => new Multiaddr(a))
  }

  /**
   * Get observed multiaddrs.
   *
   * @returns {Array<Multiaddr>}
   */
  getObservedAddrs () {
    return Array.from(this.observed).map((a) => new Multiaddr(a))
  }

  /**
   * Add peer observed addresses
   *
   * @param {string | Multiaddr} addr
   */
  addObservedAddr (addr) {
    let ma = new Multiaddr(addr)
    const remotePeer = ma.getPeerId()

    // strip our peer id if it has been passed
    if (remotePeer) {
      const remotePeerId = PeerId.createFromB58String(remotePeer)

      // use same encoding for comparison
      if (remotePeerId.equals(this.peerId)) {
        ma = ma.decapsulate(new Multiaddr(`/p2p/${this.peerId}`))
      }
    }

    const addrString = ma.toString()

    // do not trigger the change:addresses event if we already know about this address
    if (this.observed.has(addrString)) {
      return
    }

    this.observed.add(addrString)
    this.emit('change:addresses')
  }
}

module.exports = AddressManager
