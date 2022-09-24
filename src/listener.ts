import net from 'net'
import { logger } from '@libp2p/logger'
import { toMultiaddrConnection } from './socket-to-conn.js'
import { CODE_P2P } from './constants.js'
import {
  getMultiaddrs,
  multiaddrToNetConfig
} from './utils.js'
import { EventEmitter, CustomEvent } from '@libp2p/interfaces/events'
import type { MultiaddrConnection, Connection } from '@libp2p/interface-connection'
import type { Upgrader, Listener } from '@libp2p/interface-transport'
import type { Server } from 'net'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { TCPCreateListenerOptions } from './index.js'

const log = logger('libp2p:tcp:listener')

interface ServerWithMultiaddrConnections extends Server {
  __connections: MultiaddrConnection[]
}

/**
 * Attempts to close the given maConn. If a failure occurs, it will be logged
 */
async function attemptClose (maConn: MultiaddrConnection) {
  try {
    await maConn.close()
  } catch (err) {
    log.error('an error occurred closing the connection', err)
  }
}

interface Context extends TCPCreateListenerOptions {
  handler?: (conn: Connection) => void
  upgrader: Upgrader
  socketInactivityTimeout?: number
  socketCloseTimeout?: number
}

/**
 * Create listener
 */
export function createListener (context: Context) {
  const {
    handler, upgrader, socketInactivityTimeout, socketCloseTimeout
  } = context

  context.keepAlive = context.keepAlive ?? true

  let peerId: string | null
  let listeningAddr: Multiaddr

  const server: ServerWithMultiaddrConnections = Object.assign(net.createServer(context, socket => {
    // Avoid uncaught errors caused by unstable connections
    socket.on('error', err => {
      log('socket error', err)
    })

    let maConn: MultiaddrConnection
    try {
      maConn = toMultiaddrConnection(socket, {
        listeningAddr,
        socketInactivityTimeout,
        socketCloseTimeout
      })
    } catch (err) {
      log.error('inbound connection failed', err)
      return
    }

    log('new inbound connection %s', maConn.remoteAddr)
    try {
      upgrader.upgradeInbound(maConn)
        .then((conn) => {
          log('inbound connection %s upgraded', maConn.remoteAddr)
          trackConn(server, maConn, socket)

          if (handler != null) {
            handler(conn)
          }

          listener.dispatchEvent(new CustomEvent<Connection>('connection', { detail: conn }))
        })
        .catch(async err => {
          log.error('inbound connection failed', err)

          await attemptClose(maConn)
        })
        .catch(err => {
          log.error('closing inbound connection failed', err)
        })
    } catch (err) {
      log.error('inbound connection failed', err)

      attemptClose(maConn)
        .catch(err => {
          log.error('closing inbound connection failed', err)
        })
    }
  }),
  // Keep track of open connections to destroy in case of timeout
  { __connections: [] })

  const listener: Listener = Object.assign(new EventEmitter(), {
    getAddrs: () => {
      let addrs: Multiaddr[] = []
      const address = server.address()

      if (address == null) {
        return []
      }

      if (typeof address === 'string') {
        addrs = [listeningAddr]
      } else {
        try {
          // Because TCP will only return the IPv6 version
          // we need to capture from the passed multiaddr
          if (listeningAddr.toString().startsWith('/ip4')) {
            addrs = addrs.concat(getMultiaddrs('ip4', address.address, address.port))
          } else if (address.family === 'IPv6') {
            addrs = addrs.concat(getMultiaddrs('ip6', address.address, address.port))
          }
        } catch (err) {
          log.error('could not turn %s:%s into multiaddr', address.address, address.port, err)
        }
      }

      return addrs.map(ma => peerId != null ? ma.encapsulate(`/p2p/${peerId}`) : ma)
    },
    listen: async (ma: Multiaddr) => {
      listeningAddr = ma
      peerId = ma.getPeerId()

      if (peerId == null) {
        listeningAddr = ma.decapsulateCode(CODE_P2P)
      }

      return await new Promise<void>((resolve, reject) => {
        const options = multiaddrToNetConfig(listeningAddr)
        server.listen(options, (err?: any) => {
          if (err != null) {
            return reject(err)
          }
          log('Listening on %s', server.address())
          resolve()
        })
      })
    },
    close: async () => {
      if (!server.listening) {
        return
      }

      await Promise.all(
        server.__connections.map(async maConn => await attemptClose(maConn))
      )

      await new Promise<void>((resolve, reject) => {
        server.close(err => (err != null) ? reject(err) : resolve())
      })
    }
  })

  server
    .on('listening', () => listener.dispatchEvent(new CustomEvent('listening')))
    .on('error', err => listener.dispatchEvent(new CustomEvent<Error>('error', { detail: err })))
    .on('close', () => listener.dispatchEvent(new CustomEvent('close')))

  return listener
}

function trackConn (server: ServerWithMultiaddrConnections, maConn: MultiaddrConnection, socket: net.Socket) {
  server.__connections.push(maConn)

  const untrackConn = () => {
    server.__connections = server.__connections.filter(c => c !== maConn)
  }

  socket.once('close', untrackConn)
}
