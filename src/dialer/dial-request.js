'use strict'

const AbortController = require('abort-controller')
const anySignal = require('any-signal')
const debug = require('debug')
const errCode = require('err-code')
const log = debug('libp2p:dialer:request')
log.error = debug('libp2p:dialer:request:error')
const FIFO = require('p-fifo')
const pAny = require('p-any')

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
    const tokens = this.dialer.getTokens(this.addrs.length)
    // If no tokens are available, throw
    if (tokens.length < 1) {
      throw errCode(new Error('No dial tokens available'), 'ERR_NO_DIAL_TOKENS')
    }

    const tokenHolder = new FIFO()
    tokens.forEach(token => tokenHolder.push(token))
    const dialAbortControllers = this.addrs.map(() => new AbortController())
    let completedDials = 0

    try {
      return await pAny(this.addrs.map(async (addr, i) => {
        const token = await tokenHolder.shift() // get token
        let conn
        try {
          const signal = dialAbortControllers[i].signal
          conn = await this.dialAction(addr, { ...options, signal: anySignal([signal, options.signal]) })
          // Remove the successful AbortController so it is not aborted
          dialAbortControllers.splice(i, 1)
        } finally {
          completedDials++
          // If we have more dials to make, recycle the token, otherwise release it
          if (completedDials < this.addrs.length) {
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

module.exports.DialRequest = DialRequest
