import net from 'net'
import { CodeError, TypedEventEmitter } from '@libp2p/interface'
import { CODE_P2P } from './constants.js'
import { toMultiaddrConnection } from './socket-to-conn.js'
import {
  getMultiaddrs,
  multiaddrToNetConfig,
  type NetConfig
} from './utils.js'
import type { TCPCreateListenerOptions } from './index.js'
import type { ComponentLogger, Logger, LoggerOptions, MultiaddrConnection, Connection, CounterGroup, MetricGroup, Metrics, Listener, ListenerEvents, Upgrader } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'

/**
 * Attempts to close the given maConn. If a failure occurs, it will be logged
 */
async function attemptClose (maConn: MultiaddrConnection, options: LoggerOptions): Promise<void> {
  try {
    await maConn.close()
  } catch (err: any) {
    options.log.error('an error occurred closing the connection', err)
    maConn.abort(err)
  }
}

export interface CloseServerOnMaxConnectionsOpts {
  /**
   * Server listens once connection count is less than `listenBelow`
   */
  listenBelow: number

  /**
   * Close server once connection count is greater than or equal to `closeAbove`
   */
  closeAbove: number

  /**
   * Invoked when there was an error listening on a socket
   */
  onListenError?(err: Error): void
}

interface Context extends TCPCreateListenerOptions {
  handler?(conn: Connection): void
  upgrader: Upgrader
  socketInactivityTimeout?: number
  socketCloseTimeout?: number
  maxConnections?: number
  backlog?: number
  metrics?: Metrics
  closeServerOnMaxConnections?: CloseServerOnMaxConnectionsOpts
  logger: ComponentLogger
}

export interface TCPListenerMetrics {
  status: MetricGroup
  errors: CounterGroup
  events: CounterGroup
}

enum TCPListenerStatusCode {
  /**
   * When server object is initialized but we don't know the listening address
   * yet or the server object is stopped manually, can be resumed only by
   * calling listen()
   **/
  INACTIVE = 0,
  ACTIVE = 1,
  /* During the connection limits */
  PAUSED = 2,
}

type Status = { code: TCPListenerStatusCode.INACTIVE } | {
  code: Exclude<TCPListenerStatusCode, TCPListenerStatusCode.INACTIVE>
  listeningAddr: Multiaddr
  peerId: string | null
  netConfig: NetConfig
}

export class TCPListener extends TypedEventEmitter<ListenerEvents> implements Listener {
  private readonly server: net.Server
  /** Keep track of open connections to destroy in case of timeout */
  private readonly connections = new Set<MultiaddrConnection>()
  private status: Status = { code: TCPListenerStatusCode.INACTIVE }
  private metrics?: TCPListenerMetrics
  private addr: string
  private readonly log: Logger

  constructor (private readonly context: Context) {
    super()

    context.keepAlive = context.keepAlive ?? true
    context.noDelay = context.noDelay ?? true

    this.log = context.logger.forComponent('libp2p:tcp:listener')
    this.addr = 'unknown'
    this.server = net.createServer(context, this.onSocket.bind(this))

    // https://nodejs.org/api/net.html#servermaxconnections
    // If set reject connections when the server's connection count gets high
    // Useful to prevent too resource exhaustion via many open connections on
    // high bursts of activity
    if (context.maxConnections !== undefined) {
      this.server.maxConnections = context.maxConnections
    }

    if (context.closeServerOnMaxConnections != null) {
      // Sanity check options
      if (context.closeServerOnMaxConnections.closeAbove < context.closeServerOnMaxConnections.listenBelow) {
        throw new CodeError('closeAbove must be >= listenBelow', 'ERR_CONNECTION_LIMITS')
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
            [this.addr]: TCPListenerStatusCode.ACTIVE
          })
        }

        this.safeDispatchEvent('listening')
      })
      .on('error', err => {
        this.metrics?.errors.increment({ [`${this.addr} listen_error`]: true })
        this.safeDispatchEvent('error', { detail: err })
      })
      .on('close', () => {
        this.metrics?.status.update({
          [this.addr]: this.status.code
        })

        // If this event is emitted, the transport manager will remove the
        // listener from it's cache in the meanwhile if the connections are
        // dropped then listener will start listening again and the transport
        // manager will not be able to close the server
        if (this.status.code !== TCPListenerStatusCode.PAUSED) {
          this.safeDispatchEvent('close')
        }
      })
  }

  private onSocket (socket: net.Socket): void {
    if (this.status.code !== TCPListenerStatusCode.ACTIVE) {
      throw new CodeError('Server is not listening yet', 'ERR_SERVER_NOT_RUNNING')
    }
    // Avoid uncaught errors caused by unstable connections
    socket.on('error', err => {
      this.log('socket error', err)
      this.metrics?.events.increment({ [`${this.addr} error`]: true })
    })

    let maConn: MultiaddrConnection
    try {
      maConn = toMultiaddrConnection(socket, {
        listeningAddr: this.status.listeningAddr,
        socketInactivityTimeout: this.context.socketInactivityTimeout,
        socketCloseTimeout: this.context.socketCloseTimeout,
        metrics: this.metrics?.events,
        metricPrefix: `${this.addr} `,
        logger: this.context.logger
      })
    } catch (err) {
      this.log.error('inbound connection failed', err)
      this.metrics?.errors.increment({ [`${this.addr} inbound_to_connection`]: true })
      return
    }

    this.log('new inbound connection %s', maConn.remoteAddr)

    try {
      this.context.upgrader.upgradeInbound(maConn)
        .then((conn) => {
          this.log('inbound connection upgraded %s', maConn.remoteAddr)
          this.connections.add(maConn)

          socket.once('close', () => {
            this.connections.delete(maConn)

            if (
              this.context.closeServerOnMaxConnections != null &&
              this.connections.size < this.context.closeServerOnMaxConnections.listenBelow
            ) {
              // The most likely case of error is if the port taken by this
              // application is bound by another process during the time the
              // server if closed. In that case there's not much we can do.
              // resume() will be called again every time a connection is
              // dropped, which acts as an eventual retry mechanism.
              // onListenError allows the consumer act on this.
              this.resume().catch(e => {
                this.log.error('error attempting to listen server once connection count under limit', e)
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
            this.pause(false).catch(e => {
              this.log.error('error attempting to close server once connection count over limit', e)
            })
          }

          this.safeDispatchEvent('connection', { detail: conn })
        })
        .catch(async err => {
          this.log.error('inbound connection failed', err)
          this.metrics?.errors.increment({ [`${this.addr} inbound_upgrade`]: true })

          await attemptClose(maConn, {
            log: this.log
          })
        })
        .catch(err => {
          this.log.error('closing inbound connection failed', err)
        })
    } catch (err) {
      this.log.error('inbound connection failed', err)

      attemptClose(maConn, {
        log: this.log
      })
        .catch(err => {
          this.log.error('closing inbound connection failed', err)
          this.metrics?.errors.increment({ [`${this.addr} inbound_closing_failed`]: true })
        })
    }
  }

  getAddrs (): Multiaddr[] {
    if (this.status.code === TCPListenerStatusCode.INACTIVE) {
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
        this.log.error('could not turn %s:%s into multiaddr', address.address, address.port, err)
      }
    }

    return addrs.map(ma => peerId != null ? ma.encapsulate(`/p2p/${peerId}`) : ma)
  }

  async listen (ma: Multiaddr): Promise<void> {
    if (this.status.code === TCPListenerStatusCode.ACTIVE || this.status.code === TCPListenerStatusCode.PAUSED) {
      throw new CodeError('server is already listening', 'ERR_SERVER_ALREADY_LISTENING')
    }

    const peerId = ma.getPeerId()
    const listeningAddr = peerId == null ? ma.decapsulateCode(CODE_P2P) : ma
    const { backlog } = this.context

    try {
      this.status = {
        code: TCPListenerStatusCode.ACTIVE,
        listeningAddr,
        peerId,
        netConfig: multiaddrToNetConfig(listeningAddr, { backlog })
      }

      await this.resume()
    } catch (err) {
      this.status = { code: TCPListenerStatusCode.INACTIVE }
      throw err
    }
  }

  async close (): Promise<void> {
    const err = new CodeError('Listener is closing', 'ERR_LISTENER_CLOSING')

    // synchronously close each connection
    this.connections.forEach(conn => {
      conn.abort(err)
    })

    // shut down the server socket, permanently
    await this.pause(true)
  }

  /**
   * Can resume a stopped or start an inert server
   */
  private async resume (): Promise<void> {
    if (this.server.listening || this.status.code === TCPListenerStatusCode.INACTIVE) {
      return
    }

    const netConfig = this.status.netConfig

    await new Promise<void>((resolve, reject) => {
      // NOTE: 'listening' event is only fired on success. Any error such as
      // port already bound, is emitted via 'error'
      this.server.once('error', reject)
      this.server.listen(netConfig, resolve)
    })

    this.status = { ...this.status, code: TCPListenerStatusCode.ACTIVE }
    this.log('listening on %s', this.server.address())
  }

  private async pause (permanent: boolean): Promise<void> {
    if (!this.server.listening && this.status.code === TCPListenerStatusCode.PAUSED && permanent) {
      this.status = { code: TCPListenerStatusCode.INACTIVE }
      return
    }

    if (!this.server.listening || this.status.code !== TCPListenerStatusCode.ACTIVE) {
      return
    }

    this.log('closing server on %s', this.server.address())

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

    // We need to set this status before closing server, so other procedures are aware
    // during the time the server is closing
    this.status = permanent ? { code: TCPListenerStatusCode.INACTIVE } : { ...this.status, code: TCPListenerStatusCode.PAUSED }

    await new Promise<void>((resolve, reject) => {
      this.server.close(err => {
        if (err != null) {
          reject(err)
          return
        }

        resolve()
      })
    })
  }
}
