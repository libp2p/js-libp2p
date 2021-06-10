'use strict'

const net = require('net')
const EventEmitter = require('events')
const debug = require('debug')
const log = Object.assign(
  debug('libp2p:tcp:listener'),
  { error: debug('libp2p:tcp:listener:error') })
const toConnection = require('./socket-to-conn')
const { CODE_P2P } = require('./constants')
const {
  getMultiaddrs,
  multiaddrToNetConfig
} = require('./utils')

/**
 * @typedef {import('multiaddr').Multiaddr} Multiaddr
 * @typedef {import('libp2p-interfaces/src/connection').Connection} Connection
 * @typedef {import('libp2p-interfaces/src/transport/types').Upgrader} Upgrader
 * @typedef {import('libp2p-interfaces/src/transport/types').MultiaddrConnection} MultiaddrConnection
 * @typedef {import('libp2p-interfaces/src/transport/types').Listener} Listener
 * @typedef {import('net').Server & {__connections: MultiaddrConnection[]}} Server
 */

/**
 * Attempts to close the given maConn. If a failure occurs, it will be logged.
 *
 * @private
 * @param {MultiaddrConnection} maConn
 */
async function attemptClose (maConn) {
  try {
    maConn && await maConn.close()
  } catch (err) {
    log.error('an error occurred closing the connection', err)
  }
}

/**
 * Create listener
 *
 * @param {object} context
 * @param {function(Connection):void} context.handler
 * @param {Upgrader} context.upgrader
 * @param {*} options
 * @returns {Listener}
 */
module.exports = ({ handler, upgrader }, options) => {
  /** @type {Server} */
  // eslint-disable-next-line prefer-const
  let server

  /** @type {string | null} */
  let peerId

  /** @type {Multiaddr} */
  let listeningAddr

  const listener = Object.assign(new EventEmitter(), {
    getAddrs: () => {
      /** @type {Multiaddr[]} */
      let addrs = []
      /** @type {import('net').AddressInfo} */
      // @ts-ignore
      const address = server.address()

      if (!address) {
        throw new Error('Listener is not ready yet')
      }

      // Because TCP will only return the IPv6 version
      // we need to capture from the passed multiaddr
      if (listeningAddr.toString().startsWith('/ip4')) {
        addrs = addrs.concat(getMultiaddrs('ip4', address.address, address.port))
      } else if (address.family === 'IPv6') {
        addrs = addrs.concat(getMultiaddrs('ip6', address.address, address.port))
      }

      return addrs.map(ma => peerId ? ma.encapsulate(`/p2p/${peerId}`) : ma)
    },
    listen: async (/** @type {Multiaddr} */ ma) => {
      listeningAddr = ma
      peerId = ma.getPeerId()

      if (peerId) {
        listeningAddr = ma.decapsulateCode(CODE_P2P)
      }

      return new Promise((resolve, reject) => {
        const options = multiaddrToNetConfig(listeningAddr)
        server.listen(options, (/** @type {any} */ err) => {
          if (err) return reject(err)
          log('Listening on %s', server.address())
          resolve(undefined)
        })
      })
    },
    close: async () => {
      if (!server.listening) return

      return new Promise((resolve, reject) => {
        server.__connections.forEach(maConn => attemptClose(maConn))
        server.close(err => err ? reject(err) : resolve(undefined))
      })
    }
  })

  server = Object.assign(net.createServer(async socket => {
    // Avoid uncaught errors caused by unstable connections
    socket.on('error', err => log('socket error', err))

    /** @type {MultiaddrConnection} */
    let maConn
    let conn
    try {
      maConn = toConnection(socket, { listeningAddr })
      log('new inbound connection %s', maConn.remoteAddr)
      conn = await upgrader.upgradeInbound(maConn)
    } catch (err) {
      log.error('inbound connection failed', err)
      // @ts-ignore
      return attemptClose(maConn)
    }

    log('inbound connection %s upgraded', maConn.remoteAddr)

    trackConn(server, maConn)

    if (handler) handler(conn)
    listener.emit('connection', conn)
  }),
  // Keep track of open connections to destroy in case of timeout
  { __connections: [] })

  server
    .on('listening', () => listener.emit('listening'))
    .on('error', err => listener.emit('error', err))
    .on('close', () => listener.emit('close'))

  return listener
}

/**
 * @param {Server} server
 * @param {MultiaddrConnection} maConn
 */
function trackConn (server, maConn) {
  server.__connections.push(maConn)

  const untrackConn = () => {
    server.__connections = server.__connections.filter(c => c !== maConn)
  }

  // @ts-ignore
  maConn.conn.once('close', untrackConn)
}
