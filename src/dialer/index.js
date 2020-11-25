'use strict'

const multiaddr = require('multiaddr')
const errCode = require('err-code')
const TimeoutController = require('timeout-abort-controller')
const anySignal = require('any-signal')
const debug = require('debug')
const log = debug('libp2p:dialer')
log.error = debug('libp2p:dialer:error')

const { DialRequest } = require('./dial-request')
const { publicAddressesFirst } = require('libp2p-utils/src/address-sort')
const getPeer = require('../get-peer')

const { codes } = require('../errors')
const {
  DIAL_TIMEOUT,
  MAX_PARALLEL_DIALS,
  MAX_PER_PEER_DIALS
} = require('../constants')

/**
 * @typedef {import('multiaddr')} Multiaddr
 * @typedef {import('peer-id')} PeerId
 * @typedef {import('../peer-store')} PeerStore
 * @typedef {import('../transport-manager')} TransportManager
 * @typedef {import('./dial-request')} DialRequest
 */

/**
 * @typedef {Object} DialerProperties
 * @property {PeerStore} peerStore
 * @property {TransportManager} transportManager
 *
 * @typedef {Object} DialerOptions
 * @param {(addresses: Address[]) => Address[]} [options.addressSorter = publicAddressesFirst] - Sort the known addresses of a peer before trying to dial.
 * @property {number} [concurrency = MAX_PARALLEL_DIALS] - Number of max concurrent dials.
 * @property {number} [perPeerLimit = MAX_PER_PEER_DIALS] - Number of max concurrent dials per peer.
 * @property {number} [timeout = DIAL_TIMEOUT] - How long a dial attempt is allowed to take.
 * @property {Object} [resolvers = {}] - multiaddr resolvers to use when dialing
 *
 * @typedef DialTarget
 * @property {string} id
 * @property {Multiaddr[]} addrs
 *
 * @typedef PendingDial
 * @property {DialRequest} dialRequest
 * @property {TimeoutController} controller
 * @property {Promise} promise
 * @property {function():void} destroy
 */

class Dialer {
  /**
   * @class
   * @param {DialerProperties & DialerOptions} options
   */
  constructor ({
    transportManager,
    peerStore,
    addressSorter = publicAddressesFirst,
    concurrency = MAX_PARALLEL_DIALS,
    timeout = DIAL_TIMEOUT,
    perPeerLimit = MAX_PER_PEER_DIALS,
    resolvers = {}
  }) {
    this.transportManager = transportManager
    this.peerStore = peerStore
    this.addressSorter = addressSorter
    this.concurrency = concurrency
    this.timeout = timeout
    this.perPeerLimit = perPeerLimit
    this.tokens = [...new Array(concurrency)].map((_, index) => index)
    this._pendingDials = new Map()

    for (const [key, value] of Object.entries(resolvers)) {
      multiaddr.resolvers.set(key, value)
    }
  }

  /**
   * Clears any pending dials
   */
  destroy () {
    for (const dial of this._pendingDials.values()) {
      try {
        dial.controller.abort()
      } catch (err) {
        log.error(err)
      }
    }
    this._pendingDials.clear()
  }

  /**
   * Connects to a given `peer` by dialing all of its known addresses.
   * The dial to the first address that is successfully able to upgrade a connection
   * will be used.
   *
   * @param {PeerId|Multiaddr|string} peer - The peer to dial
   * @param {object} [options]
   * @param {AbortSignal} [options.signal] - An AbortController signal
   * @returns {Promise<Connection>}
   */
  async connectToPeer (peer, options = {}) {
    const dialTarget = await this._createDialTarget(peer)

    if (!dialTarget.addrs.length) {
      throw errCode(new Error('The dial request has no addresses'), codes.ERR_NO_VALID_ADDRESSES)
    }
    const pendingDial = this._pendingDials.get(dialTarget.id) || this._createPendingDial(dialTarget, options)

    try {
      const connection = await pendingDial.promise
      log('dial succeeded to %s', dialTarget.id)
      return connection
    } catch (err) {
      // Error is a timeout
      if (pendingDial.controller.signal.aborted) {
        err.code = codes.ERR_TIMEOUT
      }
      log.error(err)
      throw err
    } finally {
      pendingDial.destroy()
    }
  }

  /**
   * Creates a DialTarget. The DialTarget is used to create and track
   * the DialRequest to a given peer.
   * If a multiaddr is received it should be the first address attempted.
   *
   * @private
   * @param {PeerId|Multiaddr|string} peer - A PeerId or Multiaddr
   * @returns {Promise<DialTarget>}
   */
  async _createDialTarget (peer) {
    const { id, multiaddrs } = getPeer(peer)

    if (multiaddrs) {
      this.peerStore.addressBook.add(id, multiaddrs)
    }

    let knownAddrs = this.peerStore.addressBook.getMultiaddrsForPeer(id, this.addressSorter) || []

    // If received a multiaddr to dial, it should be the first to use
    // But, if we know other multiaddrs for the peer, we should try them too.
    if (multiaddr.isMultiaddr(peer)) {
      knownAddrs = knownAddrs.filter((addr) => !peer.equals(addr))
      knownAddrs.unshift(peer)
    }

    const addrs = []
    for (const a of knownAddrs) {
      const resolvedAddrs = await this._resolve(a)
      resolvedAddrs.forEach(ra => addrs.push(ra))
    }

    return {
      id: id.toB58String(),
      addrs
    }
  }

  /**
   * Creates a PendingDial that wraps the underlying DialRequest
   *
   * @private
   * @param {DialTarget} dialTarget
   * @param {object} [options]
   * @param {AbortSignal} [options.signal] - An AbortController signal
   * @returns {PendingDial}
   */
  _createPendingDial (dialTarget, options) {
    const dialAction = (addr, options) => {
      if (options.signal.aborted) throw errCode(new Error('already aborted'), codes.ERR_ALREADY_ABORTED)
      return this.transportManager.dial(addr, options)
    }

    const dialRequest = new DialRequest({
      addrs: dialTarget.addrs,
      dialAction,
      dialer: this
    })

    // Combine the timeout signal and options.signal, if provided
    const timeoutController = new TimeoutController(this.timeout)
    const signals = [timeoutController.signal]
    options.signal && signals.push(options.signal)
    const signal = anySignal(signals)

    const pendingDial = {
      dialRequest,
      controller: timeoutController,
      promise: dialRequest.run({ ...options, signal }),
      destroy: () => {
        timeoutController.clear()
        this._pendingDials.delete(dialTarget.id)
      }
    }
    this._pendingDials.set(dialTarget.id, pendingDial)
    return pendingDial
  }

  getTokens (num) {
    const total = Math.min(num, this.perPeerLimit, this.tokens.length)
    const tokens = this.tokens.splice(0, total)
    log('%d tokens request, returning %d, %d remaining', num, total, this.tokens.length)
    return tokens
  }

  releaseToken (token) {
    // Guard against duplicate releases
    if (this.tokens.indexOf(token) > -1) return
    log('token %d released', token)
    this.tokens.push(token)
  }

  /**
   * Resolve multiaddr recursively.
   *
   * @param {Multiaddr} ma
   * @returns {Promise<Multiaddr[]>}
   */
  async _resolve (ma) {
    // TODO: recursive logic should live in multiaddr once dns4/dns6 support is in place
    // Now only supporting resolve for dnsaddr
    const resolvableProto = ma.protoNames().includes('dnsaddr')

    // Multiaddr is not resolvable? End recursion!
    if (!resolvableProto) {
      return [ma]
    }

    const resolvedMultiaddrs = await this._resolveRecord(ma)
    const recursiveMultiaddrs = await Promise.all(resolvedMultiaddrs.map((nm) => {
      return this._resolve(nm)
    }))

    return recursiveMultiaddrs.flat().reduce((array, newM) => {
      if (!array.find(m => m.equals(newM))) {
        array.push(newM)
      }
      return array
    }, []) // Unique addresses
  }

  /**
   * Resolve a given multiaddr. If this fails, an empty array will be returned
   *
   * @param {Multiaddr} ma
   * @returns {Promise<Multiaddr[]>}
   */
  async _resolveRecord (ma) {
    try {
      ma = multiaddr(ma.toString()) // Use current multiaddr module
      const multiaddrs = await ma.resolve()
      return multiaddrs
    } catch (_) {
      log.error(`multiaddr ${ma} could not be resolved`)
      return []
    }
  }
}

module.exports = Dialer
