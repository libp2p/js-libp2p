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
import type { Upgrader, Listener, ListenerEvents } from '@libp2p/interface-transport'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { TCPCreateListenerOptions } from './index.js'

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

interface Context extends TCPCreateListenerOptions {
  handler?: (conn: Connection) => void
  upgrader: Upgrader
  socketInactivityTimeout?: number
  socketCloseTimeout?: number
  maxConnections?: number
}

type Status = {started: false} | {started: true, listeningAddr: Multiaddr, peerId: string | null }

export class TCPListener extends EventEmitter<ListenerEvents> implements Listener {
  private readonly server: net.Server
  /** Keep track of open connections to destroy in case of timeout */
  private readonly connections = new Set<MultiaddrConnection>()

  private status: Status = { started: false }

  constructor (private readonly context: Context) {
    super()

    context.keepAlive = context.keepAlive ?? true

    this.server = net.createServer(context, this.onSocket.bind(this))

    // https://nodejs.org/api/net.html#servermaxconnections
    // If set reject connections when the server's connection count gets high
    // Useful to prevent too resource exhaustion via many open connections on high bursts of activity
    if (context.maxConnections !== undefined) {
      this.server.maxConnections = context.maxConnections
    }

    this.server
      .on('listening', () => this.dispatchEvent(new CustomEvent('listening')))
      .on('error', err => this.dispatchEvent(new CustomEvent<Error>('error', { detail: err })))
      .on('close', () => this.dispatchEvent(new CustomEvent('close')))
  }

  private onSocket (socket: net.Socket) {
    // Avoid uncaught errors caused by unstable connections
    socket.on('error', err => {
      log('socket error', err)
    })

    let maConn: MultiaddrConnection
    try {
      maConn = toMultiaddrConnection(socket, {
        listeningAddr: this.status.started ? this.status.listeningAddr : undefined,
        socketInactivityTimeout: this.context.socketInactivityTimeout,
        socketCloseTimeout: this.context.socketCloseTimeout
      })
    } catch (err) {
      log.error('inbound connection failed', err)
      return
    }

    log('new inbound connection %s', maConn.remoteAddr)
    try {
      this.context.upgrader.upgradeInbound(maConn)
        .then((conn) => {
          log('inbound connection %s upgraded', maConn.remoteAddr)
          this.connections.add(maConn)

          socket.once('close', () => {
            this.connections.delete(maConn)
          })

          if (this.context.handler != null) {
            this.context.handler(conn)
          }

          this.dispatchEvent(new CustomEvent<Connection>('connection', { detail: conn }))
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
  }

  getAddrs () {
    if (!this.status.started) {
      return []
    }

    let addrs: Multiaddr[] = []
    const address = this.server.address()
    const { listeningAddr, peerId } = this.status

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
  }

  async listen (ma: Multiaddr) {
    const peerId = ma.getPeerId()
    const listeningAddr = peerId == null ? ma.decapsulateCode(CODE_P2P) : ma

    this.status = { started: true, listeningAddr, peerId }

    return await new Promise<void>((resolve, reject) => {
      const options = multiaddrToNetConfig(listeningAddr)
      this.server.on('error', (err) => {
        reject(err)
      })
      this.server.listen(options, () => {
        log('Listening on %s', this.server.address())
        resolve()
      })
    })
  }

  async close () {
    if (!this.server.listening) {
      return
    }

    await Promise.all(
      Array.from(this.connections.values()).map(async maConn => await attemptClose(maConn))
    )

    await new Promise<void>((resolve, reject) => {
      this.server.close(err => (err != null) ? reject(err) : resolve())
    })
  }
}
