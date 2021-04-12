'use strict'

const connect = require('it-ws/client')
const withIs = require('class-is')
const toUri = require('multiaddr-to-uri')
const { AbortError } = require('abortable-iterator')
const pDefer = require('p-defer')

const debug = require('debug')
const log = debug('libp2p:websockets')
log.error = debug('libp2p:websockets:error')
const env = require('ipfs-utils/src/env')

const createListener = require('./listener')
const toConnection = require('./socket-to-conn')
const filters = require('./filters')

/**
 * @typedef {import('multiaddr').Multiaddr} Multiaddr
 */

/**
 * @class WebSockets
 */
class WebSockets {
  /**
   * @class
   * @param {object} options
   * @param {Upgrader} options.upgrader
   * @param {(multiaddrs: Array<Multiaddr>) => Array<Multiaddr>} options.filter - override transport addresses filter
   */
  constructor ({ upgrader, filter }) {
    if (!upgrader) {
      throw new Error('An upgrader must be provided. See https://github.com/libp2p/interface-transport#upgrader.')
    }
    this._upgrader = upgrader
    this._filter = filter
  }

  /**
   * @async
   * @param {Multiaddr} ma
   * @param {object} [options]
   * @param {AbortSignal} [options.signal] - Used to abort dial requests
   * @returns {Connection} An upgraded Connection
   */
  async dial (ma, options = {}) {
    log('dialing %s', ma)

    const socket = await this._connect(ma, options)
    const maConn = toConnection(socket, { remoteAddr: ma, signal: options.signal })
    log('new outbound connection %s', maConn.remoteAddr)

    const conn = await this._upgrader.upgradeOutbound(maConn)
    log('outbound connection %s upgraded', maConn.remoteAddr)
    return conn
  }

  /**
   * @private
   * @param {Multiaddr} ma
   * @param {object} [options]
   * @param {AbortSignal} [options.signal] - Used to abort dial requests
   * @returns {Promise<WebSocket>} Resolves a extended duplex iterable on top of a WebSocket
   */
  async _connect (ma, options = {}) {
    if (options.signal && options.signal.aborted) {
      throw new AbortError()
    }
    const cOpts = ma.toOptions()
    log('dialing %s:%s', cOpts.host, cOpts.port)

    const errorPromise = pDefer()
    const errfn = (err) => {
      const msg = `connection error: ${err.message}`
      log.error(msg)

      errorPromise.reject(err)
    }

    const rawSocket = connect(toUri(ma), Object.assign({ binary: true }, options))

    if (rawSocket.socket.on) {
      rawSocket.socket.on('error', errfn)
    } else {
      rawSocket.socket.onerror = errfn
    }

    if (!options.signal) {
      await Promise.race([rawSocket.connected(), errorPromise.promise])

      log('connected %s', ma)
      return rawSocket
    }

    // Allow abort via signal during connect
    let onAbort
    const abort = new Promise((resolve, reject) => {
      onAbort = () => {
        reject(new AbortError())
        // FIXME: https://github.com/libp2p/js-libp2p-websockets/issues/121
        setTimeout(() => {
          rawSocket.close()
        })
      }

      // Already aborted?
      if (options.signal.aborted) return onAbort()
      options.signal.addEventListener('abort', onAbort)
    })

    try {
      await Promise.race([abort, errorPromise.promise, rawSocket.connected()])
    } finally {
      options.signal.removeEventListener('abort', onAbort)
    }

    log('connected %s', ma)
    return rawSocket
  }

  /**
   * Creates a Websockets listener. The provided `handler` function will be called
   * anytime a new incoming Connection has been successfully upgraded via
   * `upgrader.upgradeInbound`.
   *
   * @param {object} [options]
   * @param {http.Server} [options.server] - A pre-created Node.js HTTP/S server.
   * @param {function (Connection)} handler
   * @returns {Listener} A Websockets listener
   */
  createListener (options = {}, handler) {
    if (typeof options === 'function') {
      handler = options
      options = {}
    }

    return createListener({ handler, upgrader: this._upgrader }, options)
  }

  /**
   * Takes a list of `Multiaddr`s and returns only valid Websockets addresses.
   * By default, in a browser environment only DNS+WSS multiaddr is accepted,
   * while in a Node.js environment DNS+{WS, WSS} multiaddrs are accepted.
   *
   * @param {Multiaddr[]} multiaddrs
   * @returns {Multiaddr[]} Valid Websockets multiaddrs
   */
  filter (multiaddrs) {
    multiaddrs = Array.isArray(multiaddrs) ? multiaddrs : [multiaddrs]

    if (this._filter) {
      return this._filter(multiaddrs)
    }

    // Browser
    if (env.isBrowser || env.isWebWorker) {
      return filters.dnsWss(multiaddrs)
    }

    return filters.all(multiaddrs)
  }
}

module.exports = withIs(WebSockets, {
  className: 'WebSockets',
  symbolName: '@libp2p/js-libp2p-websockets/websockets'
})
