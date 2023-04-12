import net from 'net'
import * as mafmt from '@multiformats/mafmt'
import { logger } from '@libp2p/logger'
import { toMultiaddrConnection } from './socket-to-conn.js'
import { CloseServerOnMaxConnectionsOpts, TCPListener } from './listener.js'
import { multiaddrToNetConfig } from './utils.js'
import { AbortError, CodeError } from '@libp2p/interfaces/errors'
import { CODE_CIRCUIT, CODE_P2P, CODE_UNIX } from './constants.js'
import { CreateListenerOptions, DialOptions, Listener, symbol, Transport } from '@libp2p/interface-transport'
import type { AbortOptions, Multiaddr } from '@multiformats/multiaddr'
import type { Socket, IpcSocketConnectOpts, TcpSocketConnectOpts } from 'net'
import type { Connection } from '@libp2p/interface-connection'
import type { CounterGroup, Metrics } from '@libp2p/interface-metrics'

const log = logger('libp2p:tcp')

export interface TCPOptions {
  /**
   * An optional number in ms that is used as an inactivity timeout after which the socket will be closed
   */
  inboundSocketInactivityTimeout?: number

  /**
   * An optional number in ms that is used as an inactivity timeout after which the socket will be closed
   */
  outboundSocketInactivityTimeout?: number

  /**
   * When closing a socket, wait this long for it to close gracefully before it is closed more forcibly
   */
  socketCloseTimeout?: number

  /**
   * Set this property to reject connections when the server's connection count gets high.
   * https://nodejs.org/api/net.html#servermaxconnections
   */
  maxConnections?: number

  /**
   * Parameter to specify the maximum length of the queue of pending connections
   * https://nodejs.org/dist/latest-v18.x/docs/api/net.html#serverlisten
   */
  backlog?: number

  /**
   * Close server (stop listening for new connections) if connections exceed a limit.
   * Open server (start listening for new connections) if connections fall below a limit.
   */
  closeServerOnMaxConnections?: CloseServerOnMaxConnectionsOpts
}

/**
 * Expose a subset of net.connect options
 */
export interface TCPSocketOptions extends AbortOptions {
  noDelay?: boolean
  keepAlive?: boolean
  keepAliveInitialDelay?: number
  allowHalfOpen?: boolean
}

export interface TCPDialOptions extends DialOptions, TCPSocketOptions {

}

export interface TCPCreateListenerOptions extends CreateListenerOptions, TCPSocketOptions {

}

export interface TCPComponents {
  metrics?: Metrics
}

export interface TCPMetrics {
  dialerEvents: CounterGroup
}

class TCP implements Transport {
  private readonly opts: TCPOptions
  private readonly metrics?: TCPMetrics
  private readonly components: TCPComponents

  constructor (components: TCPComponents, options: TCPOptions = {}) {
    this.opts = options
    this.components = components

    if (components.metrics != null) {
      this.metrics = {
        dialerEvents: components.metrics.registerCounterGroup('libp2p_tcp_dialer_events_total', {
          label: 'event',
          help: 'Total count of TCP dialer events by type'
        })
      }
    }
  }

  get [symbol] (): true {
    return true
  }

  get [Symbol.toStringTag] (): string {
    return '@libp2p/tcp'
  }

  async dial (ma: Multiaddr, options: TCPDialOptions): Promise<Connection> {
    options.keepAlive = options.keepAlive ?? true

    // options.signal destroys the socket before 'connect' event
    const socket = await this._connect(ma, options)

    // Avoid uncaught errors caused by unstable connections
    socket.on('error', err => {
      log('socket error', err)
    })

    const maConn = toMultiaddrConnection(socket, {
      remoteAddr: ma,
      socketInactivityTimeout: this.opts.outboundSocketInactivityTimeout,
      socketCloseTimeout: this.opts.socketCloseTimeout,
      metrics: this.metrics?.dialerEvents
    })

    const onAbort = (): void => {
      maConn.close().catch(err => {
        log.error('Error closing maConn after abort', err)
      })
    }
    options.signal?.addEventListener('abort', onAbort, { once: true })

    log('new outbound connection %s', maConn.remoteAddr)
    const conn = await options.upgrader.upgradeOutbound(maConn)
    log('outbound connection %s upgraded', maConn.remoteAddr)

    options.signal?.removeEventListener('abort', onAbort)

    if (options.signal?.aborted === true) {
      conn.close().catch(err => {
        log.error('Error closing conn after abort', err)
      })

      throw new AbortError()
    }

    return conn
  }

  async _connect (ma: Multiaddr, options: TCPDialOptions): Promise<Socket> {
    if (options.signal?.aborted === true) {
      throw new AbortError()
    }

    return await new Promise<Socket>((resolve, reject) => {
      const start = Date.now()
      const cOpts = multiaddrToNetConfig(ma) as (IpcSocketConnectOpts & TcpSocketConnectOpts)
      const cOptsStr = cOpts.path ?? `${cOpts.host ?? ''}:${cOpts.port}`

      log('dialing %j', cOpts)
      const rawSocket = net.connect(cOpts)

      const onError = (err: Error): void => {
        err.message = `connection error ${cOptsStr}: ${err.message}`
        this.metrics?.dialerEvents.increment({ error: true })

        done(err)
      }

      const onTimeout = (): void => {
        log('connection timeout %s', cOptsStr)
        this.metrics?.dialerEvents.increment({ timeout: true })

        const err = new CodeError(`connection timeout after ${Date.now() - start}ms`, 'ERR_CONNECT_TIMEOUT')
        // Note: this will result in onError() being called
        rawSocket.emit('error', err)
      }

      const onConnect = (): void => {
        log('connection opened %j', cOpts)
        this.metrics?.dialerEvents.increment({ connect: true })
        done()
      }

      const onAbort = (): void => {
        log('connection aborted %j', cOpts)
        this.metrics?.dialerEvents.increment({ abort: true })
        rawSocket.destroy()
        done(new AbortError())
      }

      const done = (err?: any): void => {
        rawSocket.removeListener('error', onError)
        rawSocket.removeListener('timeout', onTimeout)
        rawSocket.removeListener('connect', onConnect)

        if (options.signal != null) {
          options.signal.removeEventListener('abort', onAbort)
        }

        if (err != null) {
          reject(err); return
        }

        resolve(rawSocket)
      }

      rawSocket.on('error', onError)
      rawSocket.on('timeout', onTimeout)
      rawSocket.on('connect', onConnect)

      if (options.signal != null) {
        options.signal.addEventListener('abort', onAbort)
      }
    })
  }

  /**
   * Creates a TCP listener. The provided `handler` function will be called
   * anytime a new incoming Connection has been successfully upgraded via
   * `upgrader.upgradeInbound`.
   */
  createListener (options: TCPCreateListenerOptions): Listener {
    return new TCPListener({
      ...options,
      maxConnections: this.opts.maxConnections,
      backlog: this.opts.backlog,
      closeServerOnMaxConnections: this.opts.closeServerOnMaxConnections,
      socketInactivityTimeout: this.opts.inboundSocketInactivityTimeout,
      socketCloseTimeout: this.opts.socketCloseTimeout,
      metrics: this.components.metrics
    })
  }

  /**
   * Takes a list of `Multiaddr`s and returns only valid TCP addresses
   */
  filter (multiaddrs: Multiaddr[]): Multiaddr[] {
    multiaddrs = Array.isArray(multiaddrs) ? multiaddrs : [multiaddrs]

    return multiaddrs.filter(ma => {
      if (ma.protoCodes().includes(CODE_CIRCUIT)) {
        return false
      }

      if (ma.protoCodes().includes(CODE_UNIX)) {
        return true
      }

      return mafmt.TCP.matches(ma.decapsulateCode(CODE_P2P))
    })
  }
}

export function tcp (init: TCPOptions = {}): (components?: TCPComponents) => Transport {
  return (components: TCPComponents = {}) => {
    return new TCP(components, init)
  }
}
