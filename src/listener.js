'use strict'

const EventEmitter = require('events')
const os = require('os')
const { Multiaddr, protocols } = require('multiaddr')
const { createServer } = require('it-ws')
const debug = require('debug')
const log = debug('libp2p:websockets:listener')
log.error = debug('libp2p:websockets:listener:error')

const toConnection = require('./socket-to-conn')

module.exports = ({ handler, upgrader }, options = {}) => {
  const listener = new EventEmitter()

  const server = createServer(options, async (stream) => {
    let maConn, conn

    try {
      maConn = toConnection(stream)
      log('new inbound connection %s', maConn.remoteAddr)
      conn = await upgrader.upgradeInbound(maConn)
    } catch (err) {
      log.error('inbound connection failed to upgrade', err)
      return maConn && maConn.close()
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
    const protos = listeningMultiaddr.protos()

    // Because TCP will only return the IPv6 version
    // we need to capture from the passed multiaddr
    if (protos.some(proto => proto.code === protocols('ip4').code)) {
      const wsProto = protos.some(proto => proto.code === protocols('ws').code) ? '/ws' : '/wss'
      let m = listeningMultiaddr.decapsulate('tcp')
      m = m.encapsulate('/tcp/' + address.port + wsProto)
      if (listeningMultiaddr.getPeerId()) {
        m = m.encapsulate('/p2p/' + ipfsId)
      }

      if (m.toString().indexOf('0.0.0.0') !== -1) {
        const netInterfaces = os.networkInterfaces()
        Object.keys(netInterfaces).forEach((niKey) => {
          netInterfaces[niKey].forEach((ni) => {
            if (ni.family === 'IPv4') {
              multiaddrs.push(new Multiaddr(m.toString().replace('0.0.0.0', ni.address)))
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
