import { type Transport, type MultiaddrFilter, symbol, type CreateListenerOptions, type DialOptions, type Listener } from '@libp2p/interface-transport'
import { AbortError } from '@libp2p/interfaces/errors'
import { logger } from '@libp2p/logger'
import { multiaddrToUri as toUri } from '@multiformats/multiaddr-to-uri'
import { connect, type WebSocketOptions } from 'it-ws/client'
import pDefer from 'p-defer'
import { isBrowser, isWebWorker } from 'wherearewe'
import * as filters from './filters.js'
import { createListener } from './listener.js'
import { socketToMaConn } from './socket-to-conn.js'
import type { Connection } from '@libp2p/interface-connection'
import type { AbortOptions } from '@libp2p/interfaces'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { Server } from 'http'
import type { DuplexWebSocket } from 'it-ws/duplex'
import type { ClientOptions } from 'ws'

const log = logger('libp2p:websockets')

export interface WebSocketsInit extends AbortOptions, WebSocketOptions {
  filter?: MultiaddrFilter
  websocket?: ClientOptions
  server?: Server
}

class WebSockets implements Transport {
  private readonly init?: WebSocketsInit

  constructor (init?: WebSocketsInit) {
    this.init = init
  }

  readonly [Symbol.toStringTag] = '@libp2p/websockets'

  readonly [symbol] = true

  async dial (ma: Multiaddr, options: DialOptions): Promise<Connection> {
    log('dialing %s', ma)
    options = options ?? {}

    const socket = await this._connect(ma, options)
    const maConn = socketToMaConn(socket, ma)
    log('new outbound connection %s', maConn.remoteAddr)

    const conn = await options.upgrader.upgradeOutbound(maConn)
    log('outbound connection %s upgraded', maConn.remoteAddr)
    return conn
  }

  async _connect (ma: Multiaddr, options: AbortOptions): Promise<DuplexWebSocket> {
    if (options?.signal?.aborted === true) {
      throw new AbortError()
    }
    const cOpts = ma.toOptions()
    log('dialing %s:%s', cOpts.host, cOpts.port)

    const errorPromise = pDefer()
    const errfn = (err: any): void => {
      log.error('connection error:', err)

      errorPromise.reject(err)
    }

    const rawSocket = connect(toUri(ma), this.init)

    if (rawSocket.socket.on != null) {
      rawSocket.socket.on('error', errfn)
    } else {
      rawSocket.socket.onerror = errfn
    }

    if (options.signal == null) {
      await Promise.race([rawSocket.connected(), errorPromise.promise])

      log('connected %s', ma)
      return rawSocket
    }

    // Allow abort via signal during connect
    let onAbort
    const abort = new Promise((resolve, reject) => {
      onAbort = () => {
        reject(new AbortError())
        rawSocket.close().catch(err => {
          log.error('error closing raw socket', err)
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

    log('connected %s', ma)
    return rawSocket
  }

  /**
   * Creates a Websockets listener. The provided `handler` function will be called
   * anytime a new incoming Connection has been successfully upgraded via
   * `upgrader.upgradeInbound`
   */
  createListener (options: CreateListenerOptions): Listener {
    return createListener({ ...this.init, ...options })
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

export function webSockets (init: WebSocketsInit = {}): (components?: any) => Transport {
  return () => {
    return new WebSockets(init)
  }
}
