/**
 * @packageDocumentation
 *
 * A [libp2p transport](https://docs.libp2p.io/concepts/transports/overview/) based on [WebSockets](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API).
 *
 * @example
 *
 * ```TypeScript
 * import { createLibp2p } from 'libp2p'
 * import { webSockets } from '@libp2p/websockets'
 * import { multiaddr } from '@multiformats/multiaddr'
 *
 * const node = await createLibp2p({
 *   transports: [
 *     webSockets()
 *   ]
 * //... other config
 * })
 * await node.start()
 *
 * const ma = multiaddr('/ip4/127.0.0.1/tcp/9090/ws')
 * await node.dial(ma)
 * ```
 *
 * ## Filters
 *
 * When run in a browser by default this module will only connect to secure web socket addresses.
 *
 * To change this you should pass a filter to the factory function.
 *
 * You can create your own address filters for this transports, or rely in the filters [provided](./src/filters.js).
 *
 * The available filters are:
 *
 * - `filters.all`
 *   - Returns all TCP and DNS based addresses, both with `ws` or `wss`.
 * - `filters.dnsWss`
 *   - Returns all DNS based addresses with `wss`.
 * - `filters.dnsWsOrWss`
 *   - Returns all DNS based addresses, both with `ws` or `wss`.
 *
 * @example Allow dialing insecure WebSockets
 *
 * ```TypeScript
 * import { createLibp2p } from 'libp2p'
 * import { webSockets } from '@libp2p/websockets'
 * import * as filters from '@libp2p/websockets/filters'
 *
 * const node = await createLibp2p({
 *   transports: [
 *     webSockets({
 *       // connect to all sockets, even insecure ones
 *       filter: filters.all
 *     })
 *   ]
 * })
 * ```
 */

import { transportSymbol, serviceCapabilities, ConnectionFailedError } from '@libp2p/interface'
import { multiaddrToUri as toUri } from '@multiformats/multiaddr-to-uri'
import { connect, type WebSocketOptions } from 'it-ws/client'
import pDefer from 'p-defer'
import { CustomProgressEvent } from 'progress-events'
import { raceSignal } from 'race-signal'
import { isBrowser, isWebWorker } from 'wherearewe'
import * as filters from './filters.js'
import { createListener } from './listener.js'
import { socketToMaConn } from './socket-to-conn.js'
import type { Transport, MultiaddrFilter, CreateListenerOptions, DialTransportOptions, Listener, AbortOptions, ComponentLogger, Logger, Connection, OutboundConnectionUpgradeEvents, Metrics, CounterGroup } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { Server } from 'http'
import type { DuplexWebSocket } from 'it-ws/duplex'
import type { ProgressEvent } from 'progress-events'
import type { ClientOptions } from 'ws'

export interface WebSocketsInit extends AbortOptions, WebSocketOptions {
  filter?: MultiaddrFilter
  websocket?: ClientOptions
  server?: Server
}

export interface WebSocketsComponents {
  logger: ComponentLogger
  metrics?: Metrics
}

export interface WebSocketsMetrics {
  dialerEvents: CounterGroup
}

export type WebSocketsDialEvents =
  OutboundConnectionUpgradeEvents |
  ProgressEvent<'websockets:open-connection'>

class WebSockets implements Transport<WebSocketsDialEvents> {
  private readonly log: Logger
  private readonly init?: WebSocketsInit
  private readonly logger: ComponentLogger
  private readonly metrics?: WebSocketsMetrics
  private readonly components: WebSocketsComponents

  constructor (components: WebSocketsComponents, init?: WebSocketsInit) {
    this.log = components.logger.forComponent('libp2p:websockets')
    this.logger = components.logger
    this.components = components
    this.init = init

    if (components.metrics != null) {
      this.metrics = {
        dialerEvents: components.metrics.registerCounterGroup('libp2p_websockets_dialer_events_total', {
          label: 'event',
          help: 'Total count of WebSockets dialer events by type'
        })
      }
    }
  }

  readonly [transportSymbol] = true

  readonly [Symbol.toStringTag] = '@libp2p/websockets'

  readonly [serviceCapabilities]: string[] = [
    '@libp2p/transport'
  ]

  async dial (ma: Multiaddr, options: DialTransportOptions<WebSocketsDialEvents>): Promise<Connection> {
    this.log('dialing %s', ma)
    options = options ?? {}

    const socket = await this._connect(ma, options)
    const maConn = socketToMaConn(socket, ma, {
      logger: this.logger,
      metrics: this.metrics?.dialerEvents
    })
    this.log('new outbound connection %s', maConn.remoteAddr)

    const conn = await options.upgrader.upgradeOutbound(maConn, options)
    this.log('outbound connection %s upgraded', maConn.remoteAddr)
    return conn
  }

  async _connect (ma: Multiaddr, options: DialTransportOptions<WebSocketsDialEvents>): Promise<DuplexWebSocket> {
    options?.signal?.throwIfAborted()

    const cOpts = ma.toOptions()
    this.log('dialing %s:%s', cOpts.host, cOpts.port)

    const errorPromise = pDefer()
    const rawSocket = connect(toUri(ma), this.init)
    rawSocket.socket.addEventListener('error', () => {
      // the WebSocket.ErrorEvent type doesn't actually give us any useful
      // information about what happened
      // https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/error_event
      const err = new ConnectionFailedError(`Could not connect to ${ma.toString()}`)
      this.log.error('connection error:', err)
      this.metrics?.dialerEvents.increment({ error: true })
      errorPromise.reject(err)
    })

    try {
      options.onProgress?.(new CustomProgressEvent('websockets:open-connection'))
      await raceSignal(Promise.race([rawSocket.connected(), errorPromise.promise]), options.signal)
    } catch (err: any) {
      if (options.signal?.aborted === true) {
        this.metrics?.dialerEvents.increment({ abort: true })
      }

      rawSocket.close()
        .catch(err => {
          this.log.error('error closing raw socket', err)
        })

      throw err
    }

    this.log('connected %s', ma)
    this.metrics?.dialerEvents.increment({ connect: true })
    return rawSocket
  }

  /**
   * Creates a Websockets listener. The provided `handler` function will be called
   * anytime a new incoming Connection has been successfully upgraded via
   * `upgrader.upgradeInbound`
   */
  createListener (options: CreateListenerOptions): Listener {
    return createListener({
      logger: this.logger,
      metrics: this.components.metrics
    }, {
      ...this.init,
      ...options
    })
  }

  /**
   * Takes a list of `Multiaddr`s and returns only valid Websockets addresses.
   * By default, in a browser environment only DNS+WSS multiaddr is accepted,
   * while in a Node.js environment DNS+{WS, WSS} multiaddrs are accepted.
   */
  listenFilter (multiaddrs: Multiaddr[]): Multiaddr[] {
    multiaddrs = Array.isArray(multiaddrs) ? multiaddrs : [multiaddrs]

    if (this.init?.filter != null) {
      return this.init?.filter(multiaddrs)
    }

    // Browser
    if (isBrowser || isWebWorker) {
      return filters.wss(multiaddrs)
    }

    return filters.all(multiaddrs)
  }

  /**
   * Filter check for all Multiaddrs that this transport can dial
   */
  dialFilter (multiaddrs: Multiaddr[]): Multiaddr[] {
    return this.listenFilter(multiaddrs)
  }
}

export function webSockets (init: WebSocketsInit = {}): (components: WebSocketsComponents) => Transport {
  return (components) => {
    return new WebSockets(components, init)
  }
}
