'use strict'

const errCode = require('err-code')
const { anySignal } = require('any-signal')
// @ts-ignore p-fifo does not export types
const FIFO = require('p-fifo')
const pAny = require('p-any')
// @ts-expect-error setMaxListeners is missing from the types
const { setMaxListeners } = require('events')
const { codes } = require('../errors')

/**
 * @typedef {import('libp2p-interfaces/src/connection').Connection} Connection
 * @typedef {import('./')} Dialer
 * @typedef {import('multiaddr').Multiaddr} Multiaddr
 */

/**
 * @typedef {Object} DialOptions
 * @property {AbortSignal} signal
 *
 * @typedef {Object} DialRequestOptions
 * @property {Multiaddr[]} addrs
 * @property {(m: Multiaddr, options: DialOptions) => Promise<Connection>} dialAction
 * @property {Dialer} dialer
 */

class DialRequest {
  /**
   * Manages running the `dialAction` on multiple provided `addrs` in parallel
   * up to a maximum determined by the number of tokens returned
   * from `dialer.getTokens`. Once a DialRequest is created, it can be
   * started using `DialRequest.run(options)`. Once a single dial has succeeded,
   * all other dials in the request will be cancelled.
   *
   * @class
   * @param {DialRequestOptions} options
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
   * @param {object} [options]
   * @param {AbortSignal} [options.signal] - An AbortController signal
   * @returns {Promise<Connection>}
   */
  async run (options = {}) {
    const tokens = this.dialer.getTokens(this.addrs.length)
    // If no tokens are available, throw
    if (tokens.length < 1) {
      throw errCode(new Error('No dial tokens available'), codes.ERR_NO_DIAL_TOKENS)
    }

    const tokenHolder = new FIFO()
    tokens.forEach(token => tokenHolder.push(token))
    const dialAbortControllers = this.addrs.map(() => {
      const controller = new AbortController()
      try {
        // fails on node < 15.4
        setMaxListeners && setMaxListeners(Infinity, controller.signal)
      } catch {}

      return controller
    })
    let completedDials = 0

    try {
      return await pAny(this.addrs.map(async (addr, i) => {
        const token = await tokenHolder.shift() // get token
        let conn
        try {
          const signal = dialAbortControllers[i].signal
          conn = await this.dialAction(addr, { ...options, signal: options.signal ? anySignal([signal, options.signal]) : signal })
          // Remove the successful AbortController so it is not aborted
          dialAbortControllers.splice(i, 1)
        } finally {
          completedDials++
          // If we have more or equal dials remaining than tokens, recycle the token, otherwise release it
          if (this.addrs.length - completedDials >= tokens.length) {
            tokenHolder.push(token)
          } else {
            this.dialer.releaseToken(tokens.splice(tokens.indexOf(token), 1)[0])
          }
        }

        return conn
      }))
    } finally {
      dialAbortControllers.map(c => c.abort()) // success/failure happened, abort everything else
      tokens.forEach(token => this.dialer.releaseToken(token)) // release tokens back to the dialer
    }
  }
}

module.exports = DialRequest
