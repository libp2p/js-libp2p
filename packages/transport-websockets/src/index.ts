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
 * import filters from '@libp2p/websockets/filters'
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

import { AbortError, CodeError } from '@libp2p/interface'
import { type Transport, type MultiaddrFilter, transportSymbol, type CreateListenerOptions, type DialOptions, type Listener, type AbortOptions, type ComponentLogger, type Logger, type Connection } from '@libp2p/interface'
import { multiaddrToUri as toUri } from '@multiformats/multiaddr-to-uri'
import { connect, type WebSocketOptions } from 'it-ws/client'
import pDefer from 'p-defer'
import { isBrowser, isWebWorker } from 'wherearewe'
import * as filters from './filters.js'
import { createListener } from './listener.js'
import { socketToMaConn } from './socket-to-conn.js'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { Server } from 'http'
import type { DuplexWebSocket } from 'it-ws/duplex'
import type { ClientOptions } from 'ws'

export interface WebSocketsInit extends AbortOptions, WebSocketOptions {
  filter?: MultiaddrFilter
  websocket?: ClientOptions
  server?: Server
}

export interface WebSocketsComponents {
  logger: ComponentLogger
}

class WebSockets implements Transport {
  private readonly log: Logger
  private readonly init?: WebSocketsInit
  private readonly logger: ComponentLogger

  constructor (components: WebSocketsComponents, init?: WebSocketsInit) {
    this.log = components.logger.forComponent('libp2p:websockets')
    this.logger = components.logger
    this.init = init
  }

  readonly [Symbol.toStringTag] = '@libp2p/websockets'

  readonly [transportSymbol] = true

  async dial (ma: Multiaddr, options: DialOptions): Promise<Connection> {
    this.log('dialing %s', ma)
    options = options ?? {}

    const socket = await this._connect(ma, options)
    const maConn = socketToMaConn(socket, ma, {
      logger: this.logger
    })
    this.log('new outbound connection %s', maConn.remoteAddr)

    const conn = await options.upgrader.upgradeOutbound(maConn)
    this.log('outbound connection %s upgraded', maConn.remoteAddr)
    return conn
  }

  async _connect (ma: Multiaddr, options: AbortOptions): Promise<DuplexWebSocket> {
    if (options?.signal?.aborted === true) {
      throw new AbortError()
    }
    const cOpts = ma.toOptions()
    this.log('dialing %s:%s', cOpts.host, cOpts.port)

    const errorPromise = pDefer()
    const rawSocket = connect(toUri(ma), this.init)
    rawSocket.socket.addEventListener('error', () => {
      // the WebSocket.ErrorEvent type doesn't actually give us any useful
      // information about what happened
      // https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/error_event
      const err = new CodeError(`Could not connect to ${ma.toString()}`, 'ERR_CONNECTION_FAILED')
      this.log.error('connection error:', err)
      errorPromise.reject(err)
    })

    if (options.signal == null) {
      await Promise.race([rawSocket.connected(), errorPromise.promise])

      this.log('connected %s', ma)
      return rawSocket
    }

    // Allow abort via signal during connect
    let onAbort
    const abort = new Promise((resolve, reject) => {
      onAbort = () => {
        reject(new AbortError())
        rawSocket.close().catch(err => {
          this.log.error('error closing raw socket', err)
        })
      }

      // Already aborted?
      if (options?.signal?.aborted === true) {
        onAbort(); return
      }

      options?.signal?.addEventListener('abort', onAbort)
    })

    try {
      await Promise.race([abort, errorPromise.promise, rawSocket.connected()])
    } finally {
      if (onAbort != null) {
        options?.signal?.removeEventListener('abort', onAbort)
      }
    }

    this.log('connected %s', ma)
    return rawSocket
  }

  /**
   * Creates a Websockets listener. The provided `handler` function will be called
   * anytime a new incoming Connection has been successfully upgraded via
   * `upgrader.upgradeInbound`
   */
  createListener (options: CreateListenerOptions): Listener {
    return createListener({
      logger: this.logger
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
  filter (multiaddrs: Multiaddr[]): Multiaddr[] {
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
}

export function webSockets (init: WebSocketsInit = {}): (components: WebSocketsComponents) => Transport {
  return (components) => {
    return new WebSockets(components, init)
  }
}
