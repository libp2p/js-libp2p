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
 * const ma = multiaddr('/dns4/example.com/tcp/9090/tls/ws')
 * await node.dial(ma)
 * ```
 */

import { transportSymbol, serviceCapabilities, ConnectionFailedError } from '@libp2p/interface'
import { multiaddrToUri as toUri } from '@multiformats/multiaddr-to-uri'
import { connect } from 'it-ws/client'
import pDefer from 'p-defer'
import { CustomProgressEvent } from 'progress-events'
import { raceSignal } from 'race-signal'
import * as filters from './filters.js'
import { createListener } from './listener.js'
import { socketToMaConn } from './socket-to-conn.js'
import type { Transport, MultiaddrFilter, CreateListenerOptions, DialTransportOptions, Listener, AbortOptions, ComponentLogger, Logger, Connection, OutboundConnectionUpgradeEvents, Metrics, CounterGroup, Libp2pEvents } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { WebSocketOptions } from 'it-ws/client'
import type { DuplexWebSocket } from 'it-ws/duplex'
import type { TypedEventTarget } from 'main-event'
import type http from 'node:http'
import type https from 'node:https'
import type { ProgressEvent } from 'progress-events'
import type { ClientOptions } from 'ws'

export interface WebSocketsInit extends AbortOptions, WebSocketOptions {
  /**
   * @deprecated Use a ConnectionGater instead
   */
  filter?: MultiaddrFilter

  /**
   * Options used to create WebSockets
   */
  websocket?: ClientOptions

  /**
   * Options used to create the HTTP server
   */
  http?: http.ServerOptions

  /**
   * Options used to create the HTTPs server. `options.http` will be used if
   * unspecified.
   */
  https?: https.ServerOptions

  /**
   * Inbound connections must complete their upgrade within this many ms
   *
   * @deprecated Use the `connectionManager.inboundUpgradeTimeout` libp2p config key instead
   */
  inboundConnectionUpgradeTimeout?: number
}

export interface WebSocketsComponents {
  logger: ComponentLogger
  events: TypedEventTarget<Libp2pEvents>
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
  private readonly init: WebSocketsInit
  private readonly logger: ComponentLogger
  private readonly metrics?: WebSocketsMetrics
  private readonly components: WebSocketsComponents

  constructor (components: WebSocketsComponents, init: WebSocketsInit = {}) {
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
      if (options.signal?.aborted) {
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
   * Creates a WebSockets listener. The provided `handler` function will be called
   * anytime a new incoming Connection has been successfully upgraded via
   * `upgrader.upgradeInbound`
   */
  createListener (options: CreateListenerOptions): Listener {
    return createListener({
      logger: this.logger,
      events: this.components.events,
      metrics: this.components.metrics
    }, {
      ...this.init,
      ...options
    })
  }

  /**
   * Takes a list of `Multiaddr`s and returns only valid WebSockets addresses.
   * By default, in a browser environment only DNS+WSS multiaddr is accepted,
   * while in a Node.js environment DNS+{WS, WSS} multiaddrs are accepted.
   */
  listenFilter (multiaddrs: Multiaddr[]): Multiaddr[] {
    multiaddrs = Array.isArray(multiaddrs) ? multiaddrs : [multiaddrs]

    if (this.init?.filter != null) {
      return this.init?.filter(multiaddrs)
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
