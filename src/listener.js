'use strict'

const net = require('net')
const EventEmitter = require('events')
const debug = require('debug')
const log = debug('libp2p:tcp:listener')
log.error = debug('libp2p:tcp:listener:error')

const toConnection = require('./socket-to-conn')
const { CODE_P2P } = require('./constants')
const {
  getMultiaddrs,
  multiaddrToNetConfig
} = require('./utils')

/**
 * Attempts to close the given maConn. If a failure occurs, it will be logged.
 *
 * @private
 * @param {import('libp2p-interfaces/src/transport/types').MultiaddrConnection} maConn
 */
async function attemptClose (maConn) {
  try {
    maConn && await maConn.close()
  } catch (err) {
    log.error('an error occurred closing the connection', err)
  }
}

module.exports = ({ handler, upgrader }, options) => {
  const listener = new EventEmitter()

  const server = net.createServer(async socket => {
    // Avoid uncaught errors caused by unstable connections
    socket.on('error', err => log('socket error', err))

    let maConn
    let conn
    try {
      maConn = toConnection(socket, { listeningAddr })
      log('new inbound connection %s', maConn.remoteAddr)
      conn = await upgrader.upgradeInbound(maConn)
    } catch (err) {
      log.error('inbound connection failed', err)
      return attemptClose(maConn)
    }

    log('inbound connection %s upgraded', maConn.remoteAddr)

    trackConn(server, maConn)

    if (handler) handler(conn)
    listener.emit('connection', conn)
  })

  server
    .on('listening', () => listener.emit('listening'))
    .on('error', err => listener.emit('error', err))
    .on('close', () => listener.emit('close'))

  // Keep track of open connections to destroy in case of timeout
  server.__connections = []

  listener.close = () => {
    if (!server.listening) return

    return new Promise((resolve, reject) => {
      server.__connections.forEach(maConn => attemptClose(maConn))
      server.close(err => err ? reject(err) : resolve())
    })
  }

  let peerId, listeningAddr

  listener.listen = ma => {
    listeningAddr = ma
    peerId = ma.getPeerId()

    if (peerId) {
      listeningAddr = ma.decapsulateCode(CODE_P2P)
    }

    return new Promise((resolve, reject) => {
      const options = multiaddrToNetConfig(listeningAddr)
      server.listen(options, err => {
        if (err) return reject(err)
        log('Listening on %s', server.address())
        resolve()
      })
    })
  }

  listener.getAddrs = () => {
    let addrs = []
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
  }

  return listener
}

function trackConn (server, maConn) {
  server.__connections.push(maConn)

  const untrackConn = () => {
    server.__connections = server.__connections.filter(c => c !== maConn)
  }

  maConn.conn.once('close', untrackConn)
}
