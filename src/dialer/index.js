'use strict'

const debug = require('debug')
const all = require('it-all')
const filter = require('it-filter')
const { pipe } = require('it-pipe')
const log = Object.assign(debug('libp2p:dialer'), {
  error: debug('libp2p:dialer:err')
})
const errCode = require('err-code')
const { Multiaddr } = require('multiaddr')
const { TimeoutController } = require('timeout-abort-controller')
const { AbortError } = require('abortable-iterator')
const { anySignal } = require('any-signal')
// @ts-expect-error setMaxListeners is missing from the types
const { setMaxListeners } = require('events')
const DialRequest = require('./dial-request')
const { publicAddressesFirst } = require('libp2p-utils/src/address-sort')
const getPeer = require('../get-peer')
const trackedMap = require('../metrics/tracked-map')
const { codes } = require('../errors')
const {
  DIAL_TIMEOUT,
  MAX_PARALLEL_DIALS,
  MAX_PER_PEER_DIALS,
  MAX_ADDRS_TO_DIAL
} = require('../constants')

const METRICS_COMPONENT = 'dialler'
const METRICS_PENDING_DIALS = 'pending-dials'
const METRICS_PENDING_DIAL_TARGETS = 'pending-dial-targets'

/**
 * @typedef {import('libp2p-interfaces/src/connection').Connection} Connection
 * @typedef {import('peer-id')} PeerId
 * @typedef {import('../peer-store/types').PeerStore} PeerStore
 * @typedef {import('../peer-store/types').Address} Address
 * @typedef {import('../transport-manager')} TransportManager
 * @typedef {import('../types').ConnectionGater} ConnectionGater
 */

/**
 * @typedef {Object} DialerProperties
 * @property {PeerStore} peerStore
 * @property {TransportManager} transportManager
 * @property {ConnectionGater} connectionGater
 *
 * @typedef {(addr:Multiaddr) => Promise<string[]>} Resolver
 *
 * @typedef {Object} DialerOptions
 * @property {(addresses: Address[]) => Address[]} [options.addressSorter = publicAddressesFirst] - Sort the known addresses of a peer before trying to dial.
 * @property {number} [maxParallelDials = MAX_PARALLEL_DIALS] - Number of max concurrent dials.
 * @property {number} [maxAddrsToDial = MAX_ADDRS_TO_DIAL] - Number of max addresses to dial for a given peer.
 * @property {number} [maxDialsPerPeer = MAX_PER_PEER_DIALS] - Number of max concurrent dials per peer.
 * @property {number} [dialTimeout = DIAL_TIMEOUT] - How long a dial attempt is allowed to take.
 * @property {Record<string, Resolver>} [resolvers = {}] - multiaddr resolvers to use when dialing
 * @property {import('../metrics')} [metrics]
 *
 * @typedef DialTarget
 * @property {string} id
 * @property {Multiaddr[]} addrs
 *
 * @typedef PendingDial
 * @property {import('./dial-request')} dialRequest
 * @property {import('timeout-abort-controller').TimeoutController} controller
 * @property {Promise<Connection>} promise
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
    connectionGater,
    addressSorter = publicAddressesFirst,
    maxParallelDials = MAX_PARALLEL_DIALS,
    maxAddrsToDial = MAX_ADDRS_TO_DIAL,
    dialTimeout = DIAL_TIMEOUT,
    maxDialsPerPeer = MAX_PER_PEER_DIALS,
    resolvers = {},
    metrics
  }) {
    this.connectionGater = connectionGater
    this.transportManager = transportManager
    this.peerStore = peerStore
    this.addressSorter = addressSorter
    this.maxParallelDials = maxParallelDials
    this.maxAddrsToDial = maxAddrsToDial
    this.timeout = dialTimeout
    this.maxDialsPerPeer = maxDialsPerPeer
    this.tokens = [...new Array(maxParallelDials)].map((_, index) => index)

    /** @type {Map<string, PendingDial>} */
    this._pendingDials = trackedMap({
      component: METRICS_COMPONENT,
      metric: METRICS_PENDING_DIALS,
      metrics
    })

    /** @type {Map<string, { resolve: (value: any) => void, reject: (err: Error) => void}>} */
    this._pendingDialTargets = trackedMap({
      component: METRICS_COMPONENT,
      metric: METRICS_PENDING_DIAL_TARGETS,
      metrics
    })

    for (const [key, value] of Object.entries(resolvers)) {
      Multiaddr.resolvers.set(key, value)
    }
  }

  /**
   * Clears any pending dials
   */
  destroy () {
    for (const dial of this._pendingDials.values()) {
      try {
        dial.controller.abort()
      } catch (/** @type {any} */ err) {
        log.error(err)
      }
    }
    this._pendingDials.clear()

    for (const pendingTarget of this._pendingDialTargets.values()) {
      pendingTarget.reject(new AbortError('Dialer was destroyed'))
    }
    this._pendingDialTargets.clear()
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
    const { id } = getPeer(peer)

    if (await this.connectionGater.denyDialPeer(id)) {
      throw errCode(new Error('The dial request is blocked by gater.allowDialPeer'), codes.ERR_PEER_DIAL_INTERCEPTED)
    }

    const dialTarget = await this._createCancellableDialTarget(peer)

    if (!dialTarget.addrs.length) {
      throw errCode(new Error('The dial request has no valid addresses'), codes.ERR_NO_VALID_ADDRESSES)
    }
    const pendingDial = this._pendingDials.get(dialTarget.id) || this._createPendingDial(dialTarget, options)

    try {
      const connection = await pendingDial.promise
      log('dial succeeded to %s', dialTarget.id)
      return connection
    } catch (/** @type {any} */ err) {
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
   * Connects to a given `peer` by dialing all of its known addresses.
   * The dial to the first address that is successfully able to upgrade a connection
   * will be used.
   *
   * @param {PeerId|Multiaddr|string} peer - The peer to dial
   * @returns {Promise<DialTarget>}
   */
  async _createCancellableDialTarget (peer) {
    // Make dial target promise cancellable
    const id = `${(parseInt(String(Math.random() * 1e9), 10)).toString() + Date.now()}`
    const cancellablePromise = new Promise((resolve, reject) => {
      this._pendingDialTargets.set(id, { resolve, reject })
    })

    try {
      const dialTarget = await Promise.race([
        this._createDialTarget(peer),
        cancellablePromise
      ])

      return dialTarget
    } finally {
      this._pendingDialTargets.delete(id)
    }
  }

  /**
   * Creates a DialTarget. The DialTarget is used to create and track
   * the DialRequest to a given peer.
   * If a multiaddr is received it should be the first address attempted.
   * Multiaddrs not supported by the available transports will be filtered out.
   *
   * @private
   * @param {PeerId|Multiaddr|string} peer - A PeerId or Multiaddr
   * @returns {Promise<DialTarget>}
   */
  async _createDialTarget (peer) {
    const { id, multiaddrs } = getPeer(peer)

    if (multiaddrs) {
      await this.peerStore.addressBook.add(id, multiaddrs)
    }

    let knownAddrs = await pipe(
      await this.peerStore.addressBook.getMultiaddrsForPeer(id, this.addressSorter),
      (source) => filter(source, async (multiaddr) => {
        return !(await this.connectionGater.denyDialMultiaddr(id, multiaddr))
      }),
      (source) => all(source)
    )

    // If received a multiaddr to dial, it should be the first to use
    // But, if we know other multiaddrs for the peer, we should try them too.
    if (Multiaddr.isMultiaddr(peer)) {
      knownAddrs = knownAddrs.filter((addr) => !peer.equals(addr))
      knownAddrs.unshift(peer)
    }

    /** @type {Multiaddr[]} */
    const addrs = []
    for (const a of knownAddrs) {
      const resolvedAddrs = await this._resolve(a)
      resolvedAddrs.forEach(ra => addrs.push(ra))
    }

    // Multiaddrs not supported by the available transports will be filtered out.
    const supportedAddrs = addrs.filter(a => this.transportManager.transportForMultiaddr(a))

    if (supportedAddrs.length > this.maxAddrsToDial) {
      await this.peerStore.delete(id)
      throw errCode(new Error('dial with more addresses than allowed'), codes.ERR_TOO_MANY_ADDRESSES)
    }

    return {
      id: id.toB58String(),
      addrs: supportedAddrs
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
  _createPendingDial (dialTarget, options = {}) {
    /**
     * @param {Multiaddr} addr
     * @param {{ signal: { aborted: any; }; }} options
     */
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

    // this signal will potentially be used while dialing lots of
    // peers so prevent MaxListenersExceededWarning appearing in the console
    try {
      // fails on node < 15.4
      setMaxListeners && setMaxListeners(Infinity, signal)
    } catch {}

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

  /**
   * @param {number} num
   */
  getTokens (num) {
    const total = Math.min(num, this.maxDialsPerPeer, this.tokens.length)
    const tokens = this.tokens.splice(0, total)
    log('%d tokens request, returning %d, %d remaining', num, total, this.tokens.length)
    return tokens
  }

  /**
   * @param {number} token
   */
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

    const addrs = recursiveMultiaddrs.flat()
    return addrs.reduce((array, newM) => {
      if (!array.find(m => m.equals(newM))) {
        array.push(newM)
      }
      return array
    }, /** @type  {Multiaddr[]} */([]))
  }

  /**
   * Resolve a given multiaddr. If this fails, an empty array will be returned
   *
   * @param {Multiaddr} ma
   * @returns {Promise<Multiaddr[]>}
   */
  async _resolveRecord (ma) {
    try {
      ma = new Multiaddr(ma.toString()) // Use current multiaddr module
      const multiaddrs = await ma.resolve()
      return multiaddrs
    } catch (_) {
      log.error(`multiaddr ${ma} could not be resolved`)
      return []
    }
  }
}

module.exports = Dialer
