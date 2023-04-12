import net from 'net'
import { logger } from '@libp2p/logger'
import { toMultiaddrConnection } from './socket-to-conn.js'
import { CODE_P2P } from './constants.js'
import {
  getMultiaddrs,
  multiaddrToNetConfig,
  NetConfig
} from './utils.js'
import { EventEmitter, CustomEvent } from '@libp2p/interfaces/events'
import type { MultiaddrConnection, Connection } from '@libp2p/interface-connection'
import type { Upgrader, Listener, ListenerEvents } from '@libp2p/interface-transport'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { TCPCreateListenerOptions } from './index.js'
import type { CounterGroup, MetricGroup, Metrics } from '@libp2p/interface-metrics'

const log = logger('libp2p:tcp:listener')

/**
 * Attempts to close the given maConn. If a failure occurs, it will be logged
 */
async function attemptClose (maConn: MultiaddrConnection): Promise<void> {
  try {
    await maConn.close()
  } catch (err) {
    log.error('an error occurred closing the connection', err)
  }
}

export interface CloseServerOnMaxConnectionsOpts {
  /** Server listens once connection count is less than `listenBelow` */
  listenBelow: number
  /** Close server once connection count is greater than or equal to `closeAbove` */
  closeAbove: number
  onListenError?: (err: Error) => void
}

interface Context extends TCPCreateListenerOptions {
  handler?: (conn: Connection) => void
  upgrader: Upgrader
  socketInactivityTimeout?: number
  socketCloseTimeout?: number
  maxConnections?: number
  backlog?: number
  metrics?: Metrics
  closeServerOnMaxConnections?: CloseServerOnMaxConnectionsOpts
}

const SERVER_STATUS_UP = 1
const SERVER_STATUS_DOWN = 0

export interface TCPListenerMetrics {
  status: MetricGroup
  errors: CounterGroup
  events: CounterGroup
}

type Status = { started: false } | {
  started: true
  listeningAddr: Multiaddr
  peerId: string | null
  netConfig: NetConfig
}

export class TCPListener extends EventEmitter<ListenerEvents> implements Listener {
  private readonly server: net.Server
  /** Keep track of open connections to destroy in case of timeout */
  private readonly connections = new Set<MultiaddrConnection>()
  private status: Status = { started: false }
  private metrics?: TCPListenerMetrics
  private addr: string

  constructor (private readonly context: Context) {
    super()

    context.keepAlive = context.keepAlive ?? true

    this.addr = 'unknown'
    this.server = net.createServer(context, this.onSocket.bind(this))

    // https://nodejs.org/api/net.html#servermaxconnections
    // If set reject connections when the server's connection count gets high
    // Useful to prevent too resource exhaustion via many open connections on high bursts of activity
    if (context.maxConnections !== undefined) {
      this.server.maxConnections = context.maxConnections
    }

    if (context.closeServerOnMaxConnections != null) {
      // Sanity check options
      if (context.closeServerOnMaxConnections.closeAbove < context.closeServerOnMaxConnections.listenBelow) {
        throw Error('closeAbove must be >= listenBelow')
      }
    }

    this.server
      .on('listening', () => {
        if (context.metrics != null) {
          // we are listening, register metrics for our port
          const address = this.server.address()

          if (address == null) {
            this.addr = 'unknown'
          } else if (typeof address === 'string') {
            // unix socket
            this.addr = address
          } else {
            this.addr = `${address.address}:${address.port}`
          }

          context.metrics?.registerMetricGroup('libp2p_tcp_inbound_connections_total', {
            label: 'address',
            help: 'Current active connections in TCP listener',
            calculate: () => {
              return {
                [this.addr]: this.connections.size
              }
            }
          })

          this.metrics = {
            status: context.metrics.registerMetricGroup('libp2p_tcp_listener_status_info', {
              label: 'address',
              help: 'Current status of the TCP listener socket'
            }),
            errors: context.metrics.registerMetricGroup('libp2p_tcp_listener_errors_total', {
              label: 'address',
              help: 'Total count of TCP listener errors by type'
            }),
            events: context.metrics.registerMetricGroup('libp2p_tcp_listener_events_total', {
              label: 'address',
              help: 'Total count of TCP listener events by type'
            })
          }

          this.metrics?.status.update({
            [this.addr]: SERVER_STATUS_UP
          })
        }

        this.dispatchEvent(new CustomEvent('listening'))
      })
      .on('error', err => {
        this.metrics?.errors.increment({ [`${this.addr} listen_error`]: true })
        this.dispatchEvent(new CustomEvent<Error>('error', { detail: err }))
      })
      .on('close', () => {
        this.metrics?.status.update({
          [this.addr]: SERVER_STATUS_DOWN
        })
        this.dispatchEvent(new CustomEvent('close'))
      })
  }

  private onSocket (socket: net.Socket): void {
    // Avoid uncaught errors caused by unstable connections
    socket.on('error', err => {
      log('socket error', err)
      this.metrics?.events.increment({ [`${this.addr} error`]: true })
    })

    let maConn: MultiaddrConnection
    try {
      maConn = toMultiaddrConnection(socket, {
        listeningAddr: this.status.started ? this.status.listeningAddr : undefined,
        socketInactivityTimeout: this.context.socketInactivityTimeout,
        socketCloseTimeout: this.context.socketCloseTimeout,
        metrics: this.metrics?.events,
        metricPrefix: `${this.addr} `
      })
    } catch (err) {
      log.error('inbound connection failed', err)
      this.metrics?.errors.increment({ [`${this.addr} inbound_to_connection`]: true })
      return
    }

    log('new inbound connection %s', maConn.remoteAddr)
    try {
      this.context.upgrader.upgradeInbound(maConn)
        .then((conn) => {
          log('inbound connection upgraded %s', maConn.remoteAddr)
          this.connections.add(maConn)

          socket.once('close', () => {
            this.connections.delete(maConn)

            if (
              this.context.closeServerOnMaxConnections != null &&
              this.connections.size < this.context.closeServerOnMaxConnections.listenBelow
            ) {
              // The most likely case of error is if the port taken by this application is binded by
              // another process during the time the server if closed. In that case there's not much
              // we can do. netListen() will be called again every time a connection is dropped, which
              // acts as an eventual retry mechanism. onListenError allows the consumer act on this.
              this.netListen().catch(e => {
                log.error('error attempting to listen server once connection count under limit', e)
                this.context.closeServerOnMaxConnections?.onListenError?.(e as Error)
              })
            }
          })

          if (this.context.handler != null) {
            this.context.handler(conn)
          }

          if (
            this.context.closeServerOnMaxConnections != null &&
            this.connections.size >= this.context.closeServerOnMaxConnections.closeAbove
          ) {
            this.netClose()
          }

          this.dispatchEvent(new CustomEvent<Connection>('connection', { detail: conn }))
        })
        .catch(async err => {
          log.error('inbound connection failed', err)
          this.metrics?.errors.increment({ [`${this.addr} inbound_upgrade`]: true })

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
          this.metrics?.errors.increment({ [`${this.addr} inbound_closing_failed`]: true })
        })
    }
  }

  getAddrs (): Multiaddr[] {
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

  async listen (ma: Multiaddr): Promise<void> {
    if (this.status.started) {
      throw Error('server is already listening')
    }

    const peerId = ma.getPeerId()
    const listeningAddr = peerId == null ? ma.decapsulateCode(CODE_P2P) : ma
    const { backlog } = this.context

    this.status = {
      started: true,
      listeningAddr,
      peerId,
      netConfig: multiaddrToNetConfig(listeningAddr, { backlog })
    }

    await this.netListen()
  }

  async close (): Promise<void> {
    await Promise.all(
      Array.from(this.connections.values()).map(async maConn => { await attemptClose(maConn) })
    )

    // netClose already checks if server.listening
    this.netClose()
  }

  private async netListen (): Promise<void> {
    if (!this.status.started || this.server.listening) {
      return
    }

    const netConfig = this.status.netConfig

    await new Promise<void>((resolve, reject) => {
      // NOTE: 'listening' event is only fired on success. Any error such as port already binded, is emitted via 'error'
      this.server.once('error', reject)
      this.server.listen(netConfig, resolve)
    })

    log('Listening on %s', this.server.address())
  }

  private netClose (): void {
    if (!this.status.started || !this.server.listening) {
      return
    }

    log('Closing server on %s', this.server.address())

    // NodeJS implementation tracks listening status with `this._handle` property.
    // - Server.close() sets this._handle to null immediately. If this._handle is null, ERR_SERVER_NOT_RUNNING is thrown
    // - Server.listening returns `this._handle !== null` https://github.com/nodejs/node/blob/386d761943bb1b217fba27d6b80b658c23009e60/lib/net.js#L1675
    // - Server.listen() if `this._handle !== null` throws ERR_SERVER_ALREADY_LISTEN
    //
    // NOTE: Both listen and close are technically not async actions, so it's not necessary to track
    // states 'pending-close' or 'pending-listen'

    // From docs https://nodejs.org/api/net.html#serverclosecallback
    // Stops the server from accepting new connections and keeps existing connections.
    // 'close' event is emitted only emitted when all connections are ended.
    // The optional callback will be called once the 'close' event occurs.
    //
    // NOTE: Since we want to keep existing connections and have checked `!this.server.listening` it's not necessary
    // to pass a callback to close.
    this.server.close()
  }
}
