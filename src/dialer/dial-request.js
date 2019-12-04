'use strict'

const AbortController = require('abort-controller')
const AggregateError = require('aggregate-error')
const pDefer = require('p-defer')
const debug = require('debug')
const log = debug('libp2p:dialer:request')
log.error = debug('libp2p:dialer:request:error')
const { AbortError } = require('libp2p-interfaces/src/transport/errors')

const { anySignal } = require('../util')
const { TokenHolder } = require('./token-holder')

class DialRequest {
  /**
   *
   * @param {object} options
   * @param {Multiaddr[]} options.addrs
   * @param {TransportManager} options.transportManager
   * @param {Dialer} options.dialer
   */
  constructor ({
    addrs,
    dialAction,
    dialer
  }) {
    this.addrs = addrs
    this.dialer = dialer
    this.dialAction = dialAction
  }

  /**
   * @async
   * @param {object} options
   * @param {AbortSignal} options.signal An AbortController signal
   * @param {number} options.timeout The max dial time for each request
   * @returns {Connection}
   */
  async run (options) {
    // Determine how many tokens we need
    const tokensWanted = Math.min(this.addrs.length, this.dialer.perPeerLimit)
    // Get the tokens
    const tokens = this.dialer.getTokens(tokensWanted)
    // If no tokens are available, throw
    if (tokens.length < 1) {
      throw Object.assign(new Error('No dial tokens available'), { code: 'ERR_NO_DIAL_TOKENS' })
    }

    // For every token, run a multiaddr dial
    // If there are tokens left, release them
    // If there are multiaddrs left, wait for tokens to finish
    const th = new TokenHolder(tokens, t => this.dialer.releaseToken(t))

    // Create the dial functions
    const dials = this.addrs.map(addr => {
      return () => this._abortableDial(addr, options)
    })

    const dialResolver = new DialResolver()
    while (dials.length > 0) {
      if (dialResolver.finished) break
      // Wait for the next available token
      const token = await th.getToken()
      const dial = dials.shift()
      dialResolver.add(dial, () => th.releaseToken(token))
    }

    // Start giving back the tokens
    th.drain()
    // Flush all the dials to get the final response
    return dialResolver.flush()
  }

  /**
   * @private
   * @param {Multiaddr} addr
   * @param {object} options
   * @param {AbortSignal} options.signal An AbortController signal
   * @param {number} options.timeout The max dial time for each request in ms
   * @returns {{abort: function(), promise: Promise<Connection>}} An AbortableDial
   */
  _abortableDial (addr, options) {
    log('starting dial to %s', addr)
    const controller = new AbortController()
    const signals = [controller.signal]
    options.signal && signals.push(options.signal)
    const signal = anySignal([controller.signal, options.signal])

    const promise = this.dialAction(addr, { signal, timeout: options.timeout })
    return {
      abort: () => controller.abort(),
      promise
    }
  }
}

class DialResolver {
  constructor () {
    this.dials = new Set()
    this.errors = []
    this.finished = false
    this.didFlush = false
    this._waiting = null
  }

  /**
   * Adds a dial function to the resolver. The function will be immediately
   * executed and its resolution tracked.
   * @async
   * @param {function()} dial A function that returns an AbortableDial
   * @param {function()} [finallyHandler] Called when the dial resolves or rejects
   */
  async add (dial, finallyHandler) {
    if (this.finished) return
    const abortableDial = dial()
    this.dials.add(abortableDial)
    try {
      this._onResolve(await abortableDial.promise)
    } catch (err) {
      this._onReject(err)
    } finally {
      this._onFinally(abortableDial)
      finallyHandler && finallyHandler()
    }
  }

  /**
   * Called when a dial resolves
   * @param {Connection} result
   */
  _onResolve (result) {
    this.result = result
  }

  /**
   * Called when a dial rejects
   * @param {Error} err
   */
  _onReject (err) {
    if (err.code === AbortError.code) return
    this.errors.push(err)
  }

  _onFinally (dial) {
    this.dials.delete(dial)
    // If we have a result, or all dials have finished
    if (this.result || (this._waiting && this.dials.size === 0)) {
      this._onFinish()
    }
  }

  /**
   * Called when dialing is completed, which means one of:
   * 1. One dial succeeded
   * 2. All dials failed
   * 3. All dials were aborted
   * @private
   */
  _onFinish () {
    this.finished = true
    // Abort all remaining dials
    for (const abortableDial of this.dials) {
      abortableDial.abort()
    }
    this.dials.clear()

    // Flush must be called
    if (!this._waiting) return
    // If we have a result, or an abort occurred (no errors and no result)
    if (this.result || this.errors.length === 0) {
      this._waiting.resolve(this.result)
    } else {
      this._waiting.reject(new AggregateError(this.errors))
    }
  }

  /**
   * Flushes any remaining dials and resolves the first
   * successful `Connection`. Flush should be called after all
   * dials have been added.
   * @returns {Promise<Connection>}
   */
  flush () {
    if (this.finished) {
      if (this.result) {
        return Promise.resolve(this.result)
      } else {
        return Promise.reject(new AggregateError(this.errors))
      }
    }
    this._waiting = pDefer()
    return this._waiting.promise
  }
}

module.exports.DialResolver = DialResolver
module.exports.DialRequest = DialRequest
