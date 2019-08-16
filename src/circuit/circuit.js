'use strict'

const mafmt = require('mafmt')
const multiaddr = require('multiaddr')

const CircuitDialer = require('./circuit/dialer')
const utilsFactory = require('./circuit/utils')

const debug = require('debug')
const log = debug('libp2p:circuit:transportdialer')
log.err = debug('libp2p:circuit:error:transportdialer')

const createListener = require('./listener')

class Circuit {
  static get tag () {
    return 'Circuit'
  }

  /**
   * Creates an instance of Dialer.
   *
   * @param {Swarm} swarm - the swarm
   * @param {any} options - config options
   *
   * @memberOf Dialer
   */
  constructor (swarm, options) {
    this.options = options || {}

    this.swarm = swarm
    this.dialer = null
    this.utils = utilsFactory(swarm)
    this.peerInfo = this.swarm._peerInfo
    this.relays = this.filter(this.peerInfo.multiaddrs.toArray())

    // if no explicit relays, add a default relay addr
    if (this.relays.length === 0) {
      this.peerInfo
        .multiaddrs
        .add(`/p2p-circuit/ipfs/${this.peerInfo.id.toB58String()}`)
    }

    this.dialer = new CircuitDialer(swarm, options)

    this.swarm.on('peer-mux-established', (peerInfo) => {
      this.dialer.canHop(peerInfo)
    })
    this.swarm.on('peer-mux-closed', (peerInfo) => {
      this.dialer.relayPeers.delete(peerInfo.id.toB58String())
    })
  }

  /**
   * Dial the relays in the Addresses.Swarm config
   *
   * @param {Array} relays
   * @return {void}
   */
  _dialSwarmRelays () {
    // if we have relay addresses in swarm config, then dial those relays
    this.relays.forEach((relay) => {
      const relaySegments = relay
        .toString()
        .split('/p2p-circuit')
        .filter(segment => segment.length)

      relaySegments.forEach((relaySegment) => {
        const ma = this.utils.peerInfoFromMa(multiaddr(relaySegment))
        this.dialer._dialRelay(ma)
      })
    })
  }

  /**
   * Dial a peer over a relay
   *
   * @param {multiaddr} ma - the multiaddr of the peer to dial
   * @param {Object} options - dial options
   * @param {Function} cb - a callback called once dialed
   * @returns {Connection} - the connection
   *
   * @memberOf Dialer
   */
  dial (ma, options, cb) {
    return this.dialer.dial(ma, options, cb)
  }

  /**
   * Create a listener
   *
   * @param {any} options
   * @param {Function} handler
   * @return {listener}
   */
  createListener (options, handler) {
    if (typeof options === 'function') {
      handler = options
      options = this.options || {}
    }

    const listener = createListener(this.swarm, options, handler)
    listener.on('listen', this._dialSwarmRelays.bind(this))
    return listener
  }

  /**
   * Filter check for all multiaddresses
   * that this transport can dial on
   *
   * @param {any} multiaddrs
   * @returns {Array<multiaddr>}
   *
   * @memberOf Dialer
   */
  filter (multiaddrs) {
    if (!Array.isArray(multiaddrs)) {
      multiaddrs = [multiaddrs]
    }
    return multiaddrs.filter((ma) => {
      return mafmt.Circuit.matches(ma)
    })
  }
}

module.exports = Circuit
