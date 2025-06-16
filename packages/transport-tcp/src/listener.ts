import net from 'net'
import { AlreadyStartedError, InvalidParametersError, NotStartedError } from '@libp2p/interface'
import { getThinWaistAddresses } from '@libp2p/utils/get-thin-waist-addresses'
import { multiaddr } from '@multiformats/multiaddr'
import { TypedEventEmitter, setMaxListeners } from 'main-event'
import { pEvent } from 'p-event'
import { toMultiaddrConnection } from './socket-to-conn.js'
import { multiaddrToNetConfig } from './utils.js'
import type { CloseServerOnMaxConnectionsOpts, TCPCreateListenerOptions } from './index.js'
import type { NetConfig } from './utils.js'
import type { ComponentLogger, Logger, MultiaddrConnection, CounterGroup, MetricGroup, Metrics, Listener, ListenerEvents, Upgrader } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'

interface Context extends TCPCreateListenerOptions {
  upgrader: Upgrader
  socketInactivityTimeout?: number
  socketCloseTimeout?: number
  maxConnections?: number
  backlog?: number
  metrics?: Metrics
  closeServerOnMaxConnections?: CloseServerOnMaxConnectionsOpts
  logger: ComponentLogger
}

interface TCPListenerMetrics {
  status?: MetricGroup
  errors?: CounterGroup
  events?: CounterGroup
}

enum TCPListenerStatusCode {
  /**
   * When server object is initialized but we don't know the listening address
   * yet or the server object is stopped manually, can be resumed only by
   * calling listen()
   */
  INACTIVE = 0,
  ACTIVE = 1,
  /* During the connection limits */
  PAUSED = 2
}

type Status = { code: TCPListenerStatusCode.INACTIVE } | {
  code: Exclude<TCPListenerStatusCode, TCPListenerStatusCode.INACTIVE>
  listeningAddr: Multiaddr
  netConfig: NetConfig
}

export class TCPListener extends TypedEventEmitter<ListenerEvents> implements Listener {
  private readonly server: net.Server
  /** Keep track of open sockets to destroy in case of timeout */
  private readonly sockets = new Set<net.Socket>()
  private status: Status = { code: TCPListenerStatusCode.INACTIVE }
  private metrics: TCPListenerMetrics
  private addr: string
  private readonly log: Logger
  private readonly shutdownController: AbortController

  constructor (private readonly context: Context) {
    super()

    context.keepAlive = context.keepAlive ?? true
    context.noDelay = context.noDelay ?? true

    this.shutdownController = new AbortController()
    setMaxListeners(Infinity, this.shutdownController.signal)

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
        throw new InvalidParametersError('closeAbove must be >= listenBelow')
      }
    }

    context.metrics?.registerMetricGroup('libp2p_tcp_inbound_connections_total', {
      label: 'address',
      help: 'Current active connections in TCP listener',
      calculate: () => {
        return {
          [this.addr]: this.sockets.size
        }
      }
    })

    this.metrics = {
      status: context.metrics?.registerMetricGroup('libp2p_tcp_listener_status_info', {
        label: 'address',
        help: 'Current status of the TCP listener socket'
      }),
      errors: context.metrics?.registerMetricGroup('libp2p_tcp_listener_errors_total', {
        label: 'address',
        help: 'Total count of TCP listener errors by type'
      }),
      events: context.metrics?.registerMetricGroup('libp2p_tcp_listener_events_total', {
        label: 'address',
        help: 'Total count of TCP listener events by type'
      })
    }

    this.server
      .on('listening', () => {
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

        this.metrics.status?.update({
          [this.addr]: TCPListenerStatusCode.ACTIVE
        })

        this.safeDispatchEvent('listening')
      })
      .on('error', err => {
        this.metrics.errors?.increment({ [`${this.addr} listen_error`]: true })
        this.safeDispatchEvent('error', { detail: err })
      })
      .on('close', () => {
        this.metrics.status?.update({
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
      .on('drop', () => {
        this.metrics.events?.increment({ [`${this.addr} drop`]: true })
      })
  }

  private onSocket (socket: net.Socket): void {
    this.metrics.events?.increment({ [`${this.addr} connection`]: true })

    if (this.status.code !== TCPListenerStatusCode.ACTIVE) {
      socket.destroy()
      throw new NotStartedError('Server is not listening yet')
    }

    let maConn: MultiaddrConnection
    try {
      maConn = toMultiaddrConnection(socket, {
        listeningAddr: this.status.listeningAddr,
        socketInactivityTimeout: this.context.socketInactivityTimeout,
        socketCloseTimeout: this.context.socketCloseTimeout,
        metrics: this.metrics?.events,
        metricPrefix: `${this.addr} `,
        logger: this.context.logger,
        direction: 'inbound'
      })
    } catch (err: any) {
      this.log.error('inbound connection failed', err)
      this.metrics.errors?.increment({ [`${this.addr} inbound_to_connection`]: true })
      socket.destroy()
      return
    }

    this.log('new inbound connection %s', maConn.remoteAddr)
    this.sockets.add(socket)

    this.context.upgrader.upgradeInbound(maConn, {
      signal: this.shutdownController.signal
    })
      .then(() => {
        this.log('inbound connection upgraded %s', maConn.remoteAddr)

        socket.once('close', () => {
          this.sockets.delete(socket)

          if (
            this.context.closeServerOnMaxConnections != null &&
            this.sockets.size < this.context.closeServerOnMaxConnections.listenBelow
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

        if (
          this.context.closeServerOnMaxConnections != null &&
          this.sockets.size >= this.context.closeServerOnMaxConnections.closeAbove
        ) {
          this.pause()
        }
      })
      .catch(async err => {
        this.log.error('inbound connection upgrade failed', err)
        this.metrics.errors?.increment({ [`${this.addr} inbound_upgrade`]: true })
        this.sockets.delete(socket)
        maConn.abort(err)
      })
  }

  getAddrs (): Multiaddr[] {
    if (this.status.code === TCPListenerStatusCode.INACTIVE) {
      return []
    }

    const address = this.server.address()

    if (address == null) {
      return []
    }

    if (typeof address === 'string') {
      return [
        multiaddr(`/unix/${encodeURIComponent(address)}`)
      ]
    }

    return getThinWaistAddresses(this.status.listeningAddr, address.port)
  }

  updateAnnounceAddrs (): void {

  }

  async listen (ma: Multiaddr): Promise<void> {
    if (this.status.code === TCPListenerStatusCode.ACTIVE || this.status.code === TCPListenerStatusCode.PAUSED) {
      throw new AlreadyStartedError('server is already listening')
    }

    try {
      this.status = {
        code: TCPListenerStatusCode.ACTIVE,
        listeningAddr: ma,
        netConfig: multiaddrToNetConfig(ma, this.context)
      }

      await this.resume()
    } catch (err) {
      this.status = { code: TCPListenerStatusCode.INACTIVE }
      throw err
    }
  }

  async close (): Promise<void> {
    const events: Array<Promise<void>> = []

    if (this.server.listening) {
      events.push(pEvent(this.server, 'close'))
    }

    // shut down the server socket, permanently
    this.pause(true)

    // stop any in-progress connection upgrades
    this.shutdownController.abort()

    // synchronously close any open connections - should be done after closing
    // the server socket in case new sockets are opened during the shutdown
    this.sockets.forEach(socket => {
      if (socket.readable) {
        events.push(pEvent(socket, 'close'))
        socket.destroy()
      }
    })

    await Promise.all(events)
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

  private pause (permanent: boolean = false): void {
    if (!this.server.listening && this.status.code === TCPListenerStatusCode.PAUSED && permanent) {
      this.status = { code: TCPListenerStatusCode.INACTIVE }
      return
    }

    if (!this.server.listening || this.status.code !== TCPListenerStatusCode.ACTIVE) {
      return
    }

    this.log('closing server on %s', this.server.address())

    // NodeJS implementation tracks listening status with `this._handle` property.
    // - Server.close() sets this._handle to null immediately. If this._handle is null, NotStartedError is thrown
    // - Server.listening returns `this._handle !== null` https://github.com/nodejs/node/blob/386d761943bb1b217fba27d6b80b658c23009e60/lib/net.js#L1675
    // - Server.listen() if `this._handle !== null` throws AlreadyStartedError
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

    // stop accepting incoming connections - existing connections are maintained
    // - any callback passed here would be invoked after existing connections
    // close, we want to maintain them so no callback is passed otherwise his
    // method will never return
    this.server.close()
  }
}
