'use strict'

const multiaddr = require('multiaddr')
const errCode = require('err-code')
const TimeoutController = require('timeout-abort-controller')
const anySignal = require('any-signal')
const debug = require('debug')
const log = debug('libp2p:dialer')
log.error = debug('libp2p:dialer:error')

const { DialRequest } = require('./dial-request')
const getPeer = require('../get-peer')

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
   * Connects to a given `peer` by dialing all of its known addresses.
   * The dial to the first address that is successfully able to upgrade a connection
   * will be used.
   *
   * @param {PeerId|Multiaddr|string} peer The peer to dial
   * @param {object} [options]
   * @param {AbortSignal} [options.signal] An AbortController signal
   * @returns {Promise<Connection>}
   */
  async connectToPeer (peer, options = {}) {
    const dialTarget = this._createDialTarget(peer)

    if (!dialTarget.addrs.length) {
      throw errCode(new Error('The dial request has no addresses'), codes.ERR_NO_VALID_ADDRESSES)
    }

    // Used for subsequent dials pending
    let subsequentDialAborted = false
    const onAbort = () => {
      subsequentDialAborted = true
      pendingDial.controller.abort()
    }

    let pendingDial = this._pendingDials.get(dialTarget.id)
    if (!pendingDial) {
      pendingDial = this._createPendingDial(dialTarget, options)
    } else {
      // track subsequent dial abort
      options.signal && options.signal.addEventListener('abort', onAbort)
    }

    try {
      const connection = await pendingDial.promise
      log('dial succeeded to %s', dialTarget.id)
      return connection
    } catch (err) {
      // Error is a timeout
      if (pendingDial.controller.signal.aborted && !subsequentDialAborted) {
        err.code = codes.ERR_TIMEOUT
      // Error is a subsequent dial abort
      } else if (subsequentDialAborted) {
        err.code = codes.ERR_SUBSEQUENT_DIAL_ABORT
      }
      log.error(err)
      throw err
    } finally {
      options.signal && options.signal.removeEventListener('abort', onAbort)
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
   * If a multiaddr is received it should be the first address attempted.
   * @private
   * @param {PeerId|Multiaddr|string} peer A PeerId or Multiaddr
   * @returns {DialTarget}
   */
  _createDialTarget (peer) {
    const { id, multiaddrs } = getPeer(peer)

    if (multiaddrs) {
      this.peerStore.addressBook.add(id, multiaddrs)
    }

    let addrs = this.peerStore.addressBook.getMultiaddrsForPeer(id) || []

    // If received a multiaddr to dial, it should be the first to use
    // But, if we know other multiaddrs for the peer, we should try them too.
    if (multiaddr.isMultiaddr(peer)) {
      addrs = addrs.filter((addr) => !peer.equals(addr))
      addrs.unshift(peer)
    }

    return {
      id: id.toB58String(),
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
}

module.exports = Dialer
