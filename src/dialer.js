'use strict'

const multiaddr = require('multiaddr')
const errCode = require('err-code')
const AbortController = require('abort-controller')
const delay = require('delay')
const debug = require('debug')
const log = debug('libp2p:dialer')
log.error = debug('libp2p:dialer:error')
const { DialRequest } = require('./dialer/dial-request')
const { anySignal } = require('./util')

const { codes } = require('./errors')
const {
  DIAL_TIMEOUT,
  MAX_PARALLEL_DIALS,
  PER_PEER_LIMIT
} = require('./constants')

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
    perPeerLimit = PER_PEER_LIMIT
  }) {
    this.transportManager = transportManager
    this.peerStore = peerStore
    this.concurrency = concurrency
    this.timeout = timeout
    this.perPeerLimit = perPeerLimit
    this.tokens = [...new Array(concurrency)].map((_, index) => index)

    this.releaseToken = this.releaseToken.bind(this)
  }

  /**
   * Connects to a given `Multiaddr`. `addr` should include the id of the peer being
   * dialed, it will be used for encryption verification.
   *
   * @param {Multiaddr} addr The address to dial
   * @param {object} [options]
   * @param {AbortSignal} [options.signal] An AbortController signal
   * @returns {Promise<Connection>}
   */
  connectToMultiaddr (addr, options = {}) {
    addr = multiaddr(addr)

    return this.connectToMultiaddrs([addr], options)
  }

  /**
   * Connects to the first success of a given list of `Multiaddr`. `addrs` should
   * include the id of the peer being dialed, it will be used for encryption verification.
   *
   * @param {Array<Multiaddr>} addrs
   * @param {object} [options]
   * @param {AbortSignal} [options.signal] An AbortController signal
   * @returns {Promise<Connection>}
   */
  async connectToMultiaddrs (addrs, options = {}) {
    const dialAction = (addr, options) => this.transportManager.dial(addr, options)
    const dialRequest = new DialRequest({
      addrs,
      dialAction,
      dialer: this
    })

    // Combine the timeout signal and options.signal, if provided
    const timeoutController = new AbortController()
    const signals = [timeoutController.signal]
    options.signal && signals.push(options.signal)
    const signal = anySignal(signals)
    const timeoutPromise = delay.reject(this.timeout, {
      value: errCode(new Error('Dial timed out'), codes.ERR_TIMEOUT)
    })

    try {
      // Race the dial request and the timeout
      const dialResult = await Promise.race([
        dialRequest.run({
          ...options,
          signal
        }),
        timeoutPromise
      ])
      timeoutPromise.clear()
      return dialResult
    } catch (err) {
      log.error(err)
      timeoutController.abort()
      throw err
    }
  }

  /**
   * Connects to a given `PeerInfo` or `PeerId` by dialing all of its known addresses.
   * The dial to the first address that is successfully able to upgrade a connection
   * will be used.
   *
   * @param {PeerId} peerId The remote peer id to dial
   * @param {object} [options]
   * @param {AbortSignal} [options.signal] An AbortController signal
   * @returns {Promise<Connection>}
   */
  connectToPeer (peerId, options = {}) {
    const addrs = this.peerStore.multiaddrsForPeer(peerId)

    // TODO: ensure the peer id is on the multiaddr

    return this.connectToMultiaddrs(addrs, options)
  }

  getTokens (num) {
    const total = Math.min(num, this.perPeerLimit, this.tokens.length)
    const tokens = this.tokens.splice(0, total)
    log('%d tokens request, returning %d, %d remaining', num, total, this.tokens.length)
    return tokens
  }

  releaseToken (token) {
    log('token %d released', token)
    this.tokens.push(token)
  }
}

module.exports = Dialer
