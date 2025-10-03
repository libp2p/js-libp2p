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
import { WebSockets as WebSocketsMatcher, WebSocketsSecure } from '@multiformats/multiaddr-matcher'
import { multiaddrToUri as toUri } from '@multiformats/multiaddr-to-uri'
import { pEvent } from 'p-event'
import { CustomProgressEvent } from 'progress-events'
import { createListener } from './listener.js'
import { webSocketToMaConn } from './websocket-to-conn.js'
import type { Transport, CreateListenerOptions, DialTransportOptions, Listener, AbortOptions, ComponentLogger, Logger, Connection, OutboundConnectionUpgradeEvents, Metrics, CounterGroup, Libp2pEvents } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { TypedEventTarget } from 'main-event'
import type http from 'node:http'
import type https from 'node:https'
import type { ProgressEvent } from 'progress-events'

export interface WebSocketsInit extends AbortOptions {
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
   * How large the outgoing [bufferedAmount](https://websockets.spec.whatwg.org/#dom-websocket-bufferedamount)
   * property of incoming and outgoing websockets is allowed to get in bytes.
   *
   * If this limit is exceeded, backpressure will be applied to the writer.
   *
   * @default 4_194_304
   */
  maxBufferedAmount?: number

  /**
   * If the [bufferedAmount](https://websockets.spec.whatwg.org/#dom-websocket-bufferedamount)
   * property of a WebSocket exceeds `maxBufferedAmount`, poll the field every
   * this number of ms to see if the socket can accept new data.
   *
   * @default 500
   */
  bufferedAmountPollInterval?: number
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

    const maConn = webSocketToMaConn({
      websocket: await this._connect(ma, options),
      remoteAddr: ma,
      metrics: this.metrics?.dialerEvents,
      direction: 'outbound',
      log: this.components.logger.forComponent('libp2p:websockets:connection'),
      maxBufferedAmount: this.init.maxBufferedAmount,
      bufferedAmountPollInterval: this.init.bufferedAmountPollInterval
    })
    this.log('new outbound connection %s', maConn.remoteAddr)

    const conn = await options.upgrader.upgradeOutbound(maConn, options)
    this.log('outbound connection %s upgraded', maConn.remoteAddr)
    return conn
  }

  async _connect (ma: Multiaddr, options: DialTransportOptions<WebSocketsDialEvents>): Promise<WebSocket> {
    options?.signal?.throwIfAborted()

    const uri = toUri(ma)
    this.log('create websocket connection to %s', uri)
    const websocket = new WebSocket(uri)
    websocket.binaryType = 'arraybuffer'

    try {
      options.onProgress?.(new CustomProgressEvent('websockets:open-connection'))
      await pEvent(websocket, 'open', options)
    } catch (err: any) {
      if (options.signal?.aborted) {
        this.metrics?.dialerEvents.increment({ abort: true })
        throw new ConnectionFailedError(`Could not connect to ${uri}`)
      } else {
        this.metrics?.dialerEvents.increment({ error: true })
      }

      try {
        websocket.close()
      } catch {}

      throw err
    }

    this.log('connected %s', ma)
    this.metrics?.dialerEvents.increment({ connect: true })
    return websocket
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

  listenFilter (multiaddrs: Multiaddr[]): Multiaddr[] {
    return multiaddrs.filter(ma => WebSocketsMatcher.exactMatch(ma) || WebSocketsSecure.exactMatch(ma))
  }

  dialFilter (multiaddrs: Multiaddr[]): Multiaddr[] {
    return this.listenFilter(multiaddrs)
  }
}

export function webSockets (init: WebSocketsInit = {}): (components: WebSocketsComponents) => Transport {
  return (components) => {
    return new WebSockets(components, init)
  }
}
