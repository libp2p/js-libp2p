import net from 'net'
import { logger } from '@libp2p/logger'
import { toMultiaddrConnection } from './socket-to-conn.js'
import { CODE_P2P } from './constants.js'
import {
  getMultiaddrs,
  multiaddrToNetConfig
} from './utils.js'
import { EventEmitter, CustomEvent } from '@libp2p/interfaces'
import type { Connection } from '@libp2p/interfaces/connection'
import type { MultiaddrConnection, Upgrader, Listener, ListenerEvents, ConnectionHandler } from '@libp2p/interfaces/transport'
import type { Server } from 'net'
import type { Multiaddr } from '@multiformats/multiaddr'

const log = logger('libp2p:tcp:listener')

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

interface Context {
  handler?: (conn: Connection) => void
  upgrader: Upgrader
}

class TCPListener extends EventEmitter<ListenerEvents> implements Listener {
  private peerId?: string
  private listeningAddr?: Multiaddr
  private readonly server: Server
  private connections: MultiaddrConnection[]

  constructor (upgrader: Upgrader, handler?: ConnectionHandler) {
    super()

    this.connections = []

    this.server = net.createServer(socket => {
      // Avoid uncaught errors caused by unstable connections
      socket.on('error', err => {
        log('socket error', err)
      })

      let maConn: MultiaddrConnection
      try {
        maConn = toMultiaddrConnection(socket, { listeningAddr: this.listeningAddr })
      } catch (err) {
        log.error('inbound connection failed', err)
        return
      }

      log('new inbound connection %s', maConn.remoteAddr)
      try {
        upgrader.upgradeInbound(maConn)
          .then((conn) => {
            log('inbound connection %s upgraded', maConn.remoteAddr)

            this.trackConn(maConn, socket)

            if (handler != null) {
              handler(conn)
            }

            this.dispatchEvent(new CustomEvent('connection', {
              detail: conn
            }))
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
    })
    this.server.on('error', err => {
      this.dispatchEvent(new CustomEvent('error', {
        detail: err
      }))
    })
    this.server.on('close', () => {
      this.dispatchEvent(new CustomEvent('close'))
    })
    this.server.on('listening', () => {
      this.dispatchEvent(new CustomEvent('listening'))
    })
  }

  getAddrs () {
    let addrs: Multiaddr[] = []
    const address = this.server.address()

    if (address == null) {
      throw new Error('Listener is not ready yet')
    }

    if (typeof address === 'string') {
      throw new Error('Incorrect server address type')
    }

    if (this.listeningAddr == null) {
      throw new Error('Listener is not ready yet')
    }

    // Because TCP will only return the IPv6 version
    // we need to capture from the passed multiaddr
    if (this.listeningAddr.toString().startsWith('/ip4')) {
      addrs = addrs.concat(getMultiaddrs('ip4', address.address, address.port))
    } else if (address.family === 'IPv6') {
      addrs = addrs.concat(getMultiaddrs('ip6', address.address, address.port))
    }

    return addrs.map(ma => this.peerId != null ? ma.encapsulate(`/p2p/${this.peerId}`) : ma)
  }

  async listen (ma: Multiaddr) {
    const peerId = ma.getPeerId()

    if (peerId == null) {
      ma = ma.decapsulateCode(CODE_P2P)
    } else {
      this.peerId = peerId
    }

    this.listeningAddr = ma

    return await new Promise<void>((resolve, reject) => {
      const options = multiaddrToNetConfig(ma)
      this.server.listen(options, (err?: any) => {
        if (err != null) {
          return reject(err)
        }
        log('Listening on %s', this.server.address())
        resolve()
      })
    })
  }

  async close () {
    if (!this.server.listening) {
      return
    }

    await Promise.all([
      this.connections.map(async maConn => await attemptClose(maConn))
    ])

    await new Promise<void>((resolve, reject) => {
      this.server.close(err => (err != null) ? reject(err) : resolve())
    })
  }

  trackConn (maConn: MultiaddrConnection, socket: net.Socket) {
    this.connections.push(maConn)

    const untrackConn = () => {
      this.connections = this.connections.filter(c => c !== maConn)
    }

    socket.once('close', untrackConn)
  }
}

/**
 * Create listener
 */
export function createListener (context: Context) {
  const {
    handler, upgrader
  } = context

  return new TCPListener(upgrader, handler)
}
