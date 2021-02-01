'use strict'

/** @typedef {import('../types').EventEmitterFactory} Events */
/** @type Events */
const EventEmitter = require('events')
const multiaddr = require('multiaddr')
const PeerId = require('peer-id')

/**
 * @typedef {import('multiaddr')} Multiaddr
 */

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
   * @param {object} [options.observedAddresses = { minConfidence: 4, maxLifetimeBeforeEviction: 600000 }] - configuration options for observed addresses
   */
  constructor (peerId, { listen = [], announce = [], observedAddresses = { minConfidence: 4, maxLifetimeBeforeEviction: (60 * 10) * 1000 } } = {}) {
    super()

    this.peerId = peerId
    this.listen = new Set(listen.map(ma => ma.toString()))
    this.announce = new Set(announce.map(ma => ma.toString()))
    this.observed = new Map()
    this.config = {
      observedAddresses: {
        minConfidence: observedAddresses.minConfidence || 4,
        maxLifetimeBeforeEviction: observedAddresses.maxLifetimeBeforeEviction || (60 * 10) * 1000
      }
    }
  }

  /**
   * Get peer listen multiaddrs.
   *
   * @returns {Multiaddr[]}
   */
  getListenAddrs () {
    return Array.from(this.listen).map((a) => multiaddr(a))
  }

  /**
   * Get peer announcing multiaddrs.
   *
   * @returns {Multiaddr[]}
   */
  getAnnounceAddrs () {
    return Array.from(this.announce).map((a) => multiaddr(a))
  }

  /**
   * Get observed multiaddrs.
   *
   * @returns {Array<Multiaddr>}
   */
  getObservedAddrs () {
    const output = []

    this.observed.forEach(({ confidence }, addr) => {
      if (confidence >= this.config.observedAddresses.minConfidence) {
        output.push(multiaddr(addr))
      }
    })

    return output
  }

  /**
   * Add peer observed addresses
   *
   * @param {string | Multiaddr} addr
   * @param {PeerId} reporter
   * @param {number} [confidence=1]
   */
  addObservedAddr (addr, reporter, confidence = 1) {
    let ma = multiaddr(addr)
    const remotePeer = ma.getPeerId()

    // strip our peer id if it has been passed
    if (remotePeer) {
      const remotePeerId = PeerId.createFromB58String(remotePeer)

      // use same encoding for comparison
      if (remotePeerId.equals(this.peerId)) {
        ma = ma.decapsulate(multiaddr(`/p2p/${this.peerId}`))
      }
    }

    const now = Date.now()
    const addrString = ma.toString()
    const wasNewAddr = !this.observed.has(addrString)
    let addrRecord = {
      confidence,
      reporters: [
        reporter.toB58String()
      ],
      expires: now + this.config.observedAddresses.maxLifetimeBeforeEviction
    }

    // we've seen this address before, increase the confidence we have in it
    if (!wasNewAddr) {
      addrRecord = this.observed.get(addrString)

      if (!addrRecord.reporters.includes(reporter.toB58String())) {
        addrRecord.confidence++
        addrRecord.reporters.push(reporter.toB58String())
        addrRecord.expires = now + this.config.observedAddresses.maxLifetimeBeforeEviction
      }
    }

    this.observed.set(addrString, addrRecord)

    // only emit event if we've reached the minimum confidence
    if (addrRecord.confidence === this.config.observedAddresses.minConfidence) {
      this.emit('change:addresses')
    }

    // evict addresses older than MAX_LOW_CONFIDENCE_ADDR_LIFETIME_MS we are not confident in
    this.observed.forEach(({ confidence, expires }, key, map) => {
      if (confidence < this.config.observedAddresses.minConfidence && expires < now) {
        map.delete(key)
      }
    })
  }
}

module.exports = AddressManager
