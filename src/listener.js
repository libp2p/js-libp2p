'use strict'

const EventEmitter = require('events')
const os = require('os')
const multiaddr = require('multiaddr')
const { createServer } = require('it-ws')

const log = require('debug')('libp2p:websockets:listener')

const toConnection = require('./socket-to-conn')

module.exports = ({ handler, upgrader }, options = {}) => {
  const listener = new EventEmitter()

  const server = createServer(options, async (stream) => {
    const maConn = toConnection(stream)

    log('new inbound connection %s', maConn.remoteAddr)

    const conn = await upgrader.upgradeInbound(maConn)
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

  let listeningMultiaddr

  listener.close = () => {
    server.__connections.forEach(maConn => maConn.close())
    return server.close()
  }

  listener.listen = (ma) => {
    listeningMultiaddr = ma

    return server.listen(ma.toOptions())
  }

  listener.getAddrs = () => {
    const multiaddrs = []
    const address = server.address()

    if (!address) {
      throw new Error('Listener is not ready yet')
    }

    const ipfsId = listeningMultiaddr.getPeerId()

    // Because TCP will only return the IPv6 version
    // we need to capture from the passed multiaddr
    if (listeningMultiaddr.toString().indexOf('ip4') !== -1) {
      let m = listeningMultiaddr.decapsulate('tcp')
      m = m.encapsulate('/tcp/' + address.port + '/ws')
      if (listeningMultiaddr.getPeerId()) {
        m = m.encapsulate('/p2p/' + ipfsId)
      }

      if (m.toString().indexOf('0.0.0.0') !== -1) {
        const netInterfaces = os.networkInterfaces()
        Object.keys(netInterfaces).forEach((niKey) => {
          netInterfaces[niKey].forEach((ni) => {
            if (ni.family === 'IPv4') {
              multiaddrs.push(multiaddr(m.toString().replace('0.0.0.0', ni.address)))
            }
          })
        })
      } else {
        multiaddrs.push(m)
      }
    }

    return multiaddrs
  }

  return listener
}

function trackConn (server, maConn) {
  server.__connections.push(maConn)
}
