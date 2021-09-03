'use strict'

const net = require('net')
const mafmt = require('mafmt')
// Missing Type
// @ts-ignore
const withIs = require('class-is')
const errCode = require('err-code')
const log = require('debug')('libp2p:tcp')
const toConnection = require('./socket-to-conn')
const createListener = require('./listener')
const { multiaddrToNetConfig } = require('./utils')
const { AbortError } = require('abortable-iterator')
const { CODE_CIRCUIT, CODE_P2P } = require('./constants')

/**
 * @typedef {import('multiaddr').Multiaddr} Multiaddr
 * @typedef {import('libp2p-interfaces/src/connection').Connection} Connection
 * @typedef {import('libp2p-interfaces/src/transport/types').Upgrader} Upgrader
 * @typedef {import('libp2p-interfaces/src/transport/types').Listener} Listener
 * @typedef {import('net').Socket} Socket
 */

class TCP {
  /**
   * @class
   * @param {object} options
   * @param {Upgrader} options.upgrader
   */
  constructor ({ upgrader }) {
    if (!upgrader) {
      throw new Error('An upgrader must be provided. See https://github.com/libp2p/interface-transport#upgrader.')
    }
    this._upgrader = upgrader
  }

  /**
   * @async
   * @param {Multiaddr} ma
   * @param {object} options
   * @param {AbortSignal} [options.signal] - Used to abort dial requests
   * @returns {Promise<Connection>} An upgraded Connection
   */
  async dial (ma, options) {
    options = options || {}
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
   * @param {object} options
   * @param {AbortSignal} [options.signal] - Used to abort dial requests
   * @returns {Promise<Socket>} Resolves a TCP Socket
   */
  _connect (ma, options = {}) {
    if (options.signal && options.signal.aborted) {
      throw new AbortError()
    }

    return new Promise((resolve, reject) => {
      const start = Date.now()
      const cOpts = multiaddrToNetConfig(ma)

      log('dialing %j', cOpts)
      const rawSocket = net.connect(cOpts)

      const onError = /** @param {Error} err */ err => {
        err.message = `connection error ${cOpts.host}:${cOpts.port}: ${err.message}`
        done(err)
      }

      const onTimeout = () => {
        log('connection timeout %s:%s', cOpts.host, cOpts.port)
        const err = errCode(new Error(`connection timeout after ${Date.now() - start}ms`), 'ERR_CONNECT_TIMEOUT')
        // Note: this will result in onError() being called
        rawSocket.emit('error', err)
      }

      const onConnect = () => {
        log('connection opened %j', cOpts)
        done()
      }

      const onAbort = () => {
        log('connection aborted %j', cOpts)
        rawSocket.destroy()
        done(new AbortError())
      }

      const done = /** @param {Error} [err] */ err => {
        rawSocket.removeListener('error', onError)
        rawSocket.removeListener('timeout', onTimeout)
        rawSocket.removeListener('connect', onConnect)
        options.signal && options.signal.removeEventListener('abort', onAbort)

        if (err) return reject(err)
        resolve(rawSocket)
      }

      rawSocket.on('error', onError)
      rawSocket.on('timeout', onTimeout)
      rawSocket.on('connect', onConnect)
      options.signal && options.signal.addEventListener('abort', onAbort)
    })
  }

  /**
   * Creates a TCP listener. The provided `handler` function will be called
   * anytime a new incoming Connection has been successfully upgraded via
   * `upgrader.upgradeInbound`.
   *
   * @param {* | function(Connection):void} options
   * @param {function(Connection):void} [handler]
   * @returns {Listener} A TCP listener
   */
  createListener (options, handler) {
    let listenerHandler

    if (typeof options === 'function') {
      listenerHandler = options
      options = {}
    } else {
      listenerHandler = handler
    }
    options = options || {}
    return createListener({ handler: listenerHandler, upgrader: this._upgrader }, options)
  }

  /**
   * Takes a list of `Multiaddr`s and returns only valid TCP addresses
   *
   * @param {Multiaddr[]} multiaddrs
   * @returns {Multiaddr[]} Valid TCP multiaddrs
   */
  filter (multiaddrs) {
    multiaddrs = Array.isArray(multiaddrs) ? multiaddrs : [multiaddrs]

    return multiaddrs.filter(ma => {
      if (ma.protoCodes().includes(CODE_CIRCUIT)) {
        return false
      }

      return mafmt.TCP.matches(ma.decapsulateCode(CODE_P2P))
    })
  }
}

const TCPWithIs = withIs(TCP, { className: 'TCP', symbolName: '@libp2p/js-libp2p-tcp/tcp' })

exports = module.exports = TCPWithIs
