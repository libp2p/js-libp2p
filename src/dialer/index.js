'use strict'

const multiaddr = require('multiaddr')
const errCode = require('err-code')
const TimeoutController = require('timeout-abort-controller')
const anySignal = require('any-signal')
const PeerId = require('peer-id')
const debug = require('debug')
const log = debug('libp2p:dialer')
log.error = debug('libp2p:dialer:error')
const { DialRequest } = require('./dial-request')

const { codes } = require('../errors')
const {
  DIAL_TIMEOUT,
  MAX_PARALLEL_DIALS,
  MAX_PER_PEER_DIALS
} = require('../constants')

class Dialer {
  /**
   * @constructor
   * @param {object} options
   * @param {TransportManager} options.transportManager
   * @param {Peerstore} peerStore
   * @param {number} options.concurrency Number of max concurrent dials. Defaults to `MAX_PARALLEL_DIALS`
   * @param {number} options.timeout How long a dial attempt is allowed to take. Defaults to `DIAL_TIMEOUT`
   */
  constructor ({
    transportManager,
    peerStore,
    concurrency = MAX_PARALLEL_DIALS,
    timeout = DIAL_TIMEOUT,
    perPeerLimit = MAX_PER_PEER_DIALS
  }) {
    this.transportManager = transportManager
    this.peerStore = peerStore
    this.concurrency = concurrency
    this.timeout = timeout
    this.perPeerLimit = perPeerLimit
    this.tokens = [...new Array(concurrency)].map((_, index) => index)
    this._pendingDials = new Map()
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
   * Connects to a given `PeerId` or `Multiaddr` by dialing all of its known addresses.
   * The dial to the first address that is successfully able to upgrade a connection
   * will be used.
   *
   * @param {PeerId|Multiaddr} peerId The peer to dial
   * @param {object} [options]
   * @param {AbortSignal} [options.signal] An AbortController signal
   * @returns {Promise<Connection>}
   */
  async connectToPeer (peerId, options = {}) {
    const dialTarget = this._createDialTarget(peerId)
    if (dialTarget.addrs.length === 0) {
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
   * @typedef DialTarget
   * @property {string} id
   * @property {Multiaddr[]} addrs
   */

  /**
   * Creates a DialTarget. The DialTarget is used to create and track
   * the DialRequest to a given peer.
   * @private
   * @param {PeerId|Multiaddr} peer A PeerId or Multiaddr
   * @returns {DialTarget}
   */
  _createDialTarget (peer) {
    const dialable = Dialer.getDialable(peer)
    if (multiaddr.isMultiaddr(dialable)) {
      return {
        id: dialable.toString(),
        addrs: [dialable]
      }
    }

    dialable.multiaddrs && this.peerStore.addressBook.add(dialable.id, Array.from(dialable.multiaddrs))
    const addrs = this.peerStore.addressBook.getMultiaddrsForPeer(dialable.id)

    return {
      id: dialable.id.toB58String(),
      addrs
    }
  }

  /**
   * @typedef PendingDial
   * @property {DialRequest} dialRequest
   * @property {TimeoutController} controller
   * @property {Promise} promise
   * @property {function():void} destroy
   */

  /**
   * Creates a PendingDial that wraps the underlying DialRequest
   * @private
   * @param {DialTarget} dialTarget
   * @param {object} [options]
   * @param {AbortSignal} [options.signal] An AbortController signal
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
   * PeerInfo object
   * @typedef {Object} peerInfo
   * @property {Multiaddr} multiaddr peer multiaddr.
   * @property {PeerId} id peer id.
   */

  /**
   * Converts the given `peer` into a `PeerInfo` or `Multiaddr`.
   * @static
   * @param {PeerId|Multiaddr|string} peer
   * @returns {peerInfo|Multiaddr}
   */
  static getDialable (peer) {
    if (typeof peer === 'string') {
      peer = multiaddr(peer)
    }

    let addrs
    if (multiaddr.isMultiaddr(peer)) {
      addrs = new Set([peer]) // TODO: after peer-info removal, a Set should not be needed
      try {
        peer = PeerId.createFromCID(peer.getPeerId())
      } catch (err) {
        throw errCode(new Error('The multiaddr did not contain a valid peer id'), codes.ERR_INVALID_PEER)
      }
    }

    if (PeerId.isPeerId(peer)) {
      peer = {
        id: peer,
        multiaddrs: addrs
      }
    }

    return peer
  }
}

module.exports = Dialer
