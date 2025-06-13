/**
 * @packageDocumentation
 *
 * A [libp2p transport](https://docs.libp2p.io/concepts/transports/overview/) based on the TCP networking stack.
 *
 * @example
 *
 * ```TypeScript
 * import { createLibp2p } from 'libp2p'
 * import { tcp } from '@libp2p/tcp'
 * import { multiaddr } from '@multiformats/multiaddr'
 *
 * const node = await createLibp2p({
 *   transports: [
 *     tcp()
 *   ]
 * })
 *
 * const ma = multiaddr('/ip4/123.123.123.123/tcp/1234')
 *
 * // dial a TCP connection, timing out after 10 seconds
 * const connection = await node.dial(ma, {
 *   signal: AbortSignal.timeout(10_000)
 * })
 *
 * // use connection...
 * ```
 */

import net from 'net'
import { AbortError, TimeoutError, serviceCapabilities, transportSymbol } from '@libp2p/interface'
import { TCP as TCPMatcher } from '@multiformats/multiaddr-matcher'
import { CustomProgressEvent } from 'progress-events'
import { TCPListener } from './listener.js'
import { toMultiaddrConnection } from './socket-to-conn.js'
import { multiaddrToNetConfig } from './utils.js'
import type { TCPComponents, TCPCreateListenerOptions, TCPDialEvents, TCPDialOptions, TCPMetrics, TCPOptions } from './index.js'
import type { Logger, Connection, Transport, Listener, MultiaddrConnection } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { Socket, IpcSocketConnectOpts, TcpSocketConnectOpts } from 'net'

export class TCP implements Transport<TCPDialEvents> {
  private readonly opts: TCPOptions
  private readonly metrics?: TCPMetrics
  private readonly components: TCPComponents
  private readonly log: Logger

  constructor (components: TCPComponents, options: TCPOptions = {}) {
    this.log = components.logger.forComponent('libp2p:tcp')
    this.opts = options
    this.components = components

    if (components.metrics != null) {
      this.metrics = {
        events: components.metrics.registerCounterGroup('libp2p_tcp_dialer_events_total', {
          label: 'event',
          help: 'Total count of TCP dialer events by type'
        }),
        errors: components.metrics.registerCounterGroup('libp2p_tcp_dialer_errors_total', {
          label: 'event',
          help: 'Total count of TCP dialer events by type'
        })
      }
    }
  }

  readonly [transportSymbol] = true

  readonly [Symbol.toStringTag] = '@libp2p/tcp'

  readonly [serviceCapabilities]: string[] = [
    '@libp2p/transport'
  ]

  async dial (ma: Multiaddr, options: TCPDialOptions): Promise<Connection> {
    options.keepAlive = options.keepAlive ?? true
    options.noDelay = options.noDelay ?? true

    // options.signal destroys the socket before 'connect' event
    const socket = await this._connect(ma, options)

    let maConn: MultiaddrConnection

    try {
      maConn = toMultiaddrConnection(socket, {
        remoteAddr: ma,
        socketInactivityTimeout: this.opts.outboundSocketInactivityTimeout,
        socketCloseTimeout: this.opts.socketCloseTimeout,
        metrics: this.metrics?.events,
        logger: this.components.logger,
        direction: 'outbound'
      })
    } catch (err: any) {
      this.metrics?.errors.increment({ outbound_to_connection: true })
      socket.destroy(err)
      throw err
    }

    try {
      this.log('new outbound connection %s', maConn.remoteAddr)
      return await options.upgrader.upgradeOutbound(maConn, options)
    } catch (err: any) {
      this.metrics?.errors.increment({ outbound_upgrade: true })
      this.log.error('error upgrading outbound connection', err)
      maConn.abort(err)
      throw err
    }
  }

  async _connect (ma: Multiaddr, options: TCPDialOptions): Promise<Socket> {
    options.signal.throwIfAborted()
    options.onProgress?.(new CustomProgressEvent('tcp:open-connection'))

    let rawSocket: Socket

    return new Promise<Socket>((resolve, reject) => {
      const start = Date.now()
      const cOpts = multiaddrToNetConfig(ma, {
        ...(this.opts.dialOpts ?? {}),
        ...options
      }) as (IpcSocketConnectOpts & TcpSocketConnectOpts)

      this.log('dialing %a', ma)
      rawSocket = net.connect(cOpts)

      const onError = (err: Error): void => {
        this.log.error('dial to %a errored - %e', ma, err)
        const cOptsStr = cOpts.path ?? `${cOpts.host ?? ''}:${cOpts.port}`
        err.message = `connection error ${cOptsStr}: ${err.message}`
        this.metrics?.events.increment({ error: true })
        done(err)
      }

      const onTimeout = (): void => {
        this.log('connection timeout %a', ma)
        this.metrics?.events.increment({ timeout: true })

        const err = new TimeoutError(`Connection timeout after ${Date.now() - start}ms`)
        // Note: this will result in onError() being called
        rawSocket.emit('error', err)
      }

      const onConnect = (): void => {
        this.log('connection opened %a', ma)
        this.metrics?.events.increment({ connect: true })
        done()
      }

      const onAbort = (): void => {
        this.log('connection aborted %a', ma)
        this.metrics?.events.increment({ abort: true })
        done(new AbortError())
      }

      const done = (err?: Error): void => {
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

      options.signal.addEventListener('abort', onAbort)
    })
      .catch(err => {
        rawSocket?.destroy()
        throw err
      })
  }

  /**
   * Creates a TCP listener. The provided `handler` function will be called
   * anytime a new incoming Connection has been successfully upgraded via
   * `upgrader.upgradeInbound`.
   */
  createListener (options: TCPCreateListenerOptions): Listener {
    return new TCPListener({
      ...(this.opts.listenOpts ?? {}),
      ...options,
      maxConnections: this.opts.maxConnections,
      backlog: this.opts.backlog,
      closeServerOnMaxConnections: this.opts.closeServerOnMaxConnections,
      socketInactivityTimeout: this.opts.inboundSocketInactivityTimeout,
      socketCloseTimeout: this.opts.socketCloseTimeout,
      metrics: this.components.metrics,
      logger: this.components.logger
    })
  }

  /**
   * Takes a list of `Multiaddr`s and returns only valid TCP addresses
   */
  listenFilter (multiaddrs: Multiaddr[]): Multiaddr[] {
    return multiaddrs.filter(ma => TCPMatcher.exactMatch(ma) || ma.toString().startsWith('/unix/'))
  }

  /**
   * Filter check for all Multiaddrs that this transport can dial
   */
  dialFilter (multiaddrs: Multiaddr[]): Multiaddr[] {
    return this.listenFilter(multiaddrs)
  }
}
