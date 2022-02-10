import { connect, WebSocketOptions } from 'it-ws/client'
import { multiaddrToUri as toUri } from '@multiformats/multiaddr-to-uri'
import { AbortError } from '@libp2p/interfaces/errors'
import pDefer from 'p-defer'
import { logger } from '@libp2p/logger'
import env from 'wherearewe'
import { createListener } from './listener.js'
import { socketToMaConn } from './socket-to-conn.js'
import * as filters from './filters.js'
import type { Transport, Upgrader, MultiaddrFilter } from '@libp2p/interfaces/transport'
import type { AbortOptions } from '@libp2p/interfaces'
import type { WebSocketListenerOptions } from './listener.js'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { DuplexWebSocket } from 'it-ws/dist/src/duplex'

const log = logger('libp2p:websockets')

/**
 * @class WebSockets
 */
export class WebSockets implements Transport<AbortOptions & WebSocketOptions, WebSocketListenerOptions> {
  private readonly upgrader: Upgrader
  private readonly _filter?: MultiaddrFilter

  constructor (opts: { upgrader: Upgrader, filter?: MultiaddrFilter }) {
    const { upgrader, filter } = opts

    if (upgrader == null) {
      throw new Error('An upgrader must be provided. See https://github.com/libp2p/js-libp2p-interfaces/tree/master/packages/libp2p-interfaces/src/transport#upgrader')
    }

    this.upgrader = upgrader
    this._filter = filter
  }

  async dial (ma: Multiaddr, options?: AbortOptions & WebSocketOptions) {
    log('dialing %s', ma)
    options = options ?? {}

    const socket = await this._connect(ma, options)
    const maConn = socketToMaConn(socket, ma)
    log('new outbound connection %s', maConn.remoteAddr)

    const conn = await this.upgrader.upgradeOutbound(maConn)
    log('outbound connection %s upgraded', maConn.remoteAddr)
    return conn
  }

  async _connect (ma: Multiaddr, options: AbortOptions & WebSocketOptions): Promise<DuplexWebSocket> {
    if (options?.signal?.aborted === true) {
      throw new AbortError()
    }
    const cOpts = ma.toOptions()
    log('dialing %s:%s', cOpts.host, cOpts.port)

    const errorPromise = pDefer()
    const errfn = (err: any) => {
      log.error('connection error:', err)

      errorPromise.reject(err)
    }

    const rawSocket = connect(toUri(ma), options)

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
        // FIXME: https://github.com/libp2p/js-libp2p-websockets/issues/121
        setTimeout(() => {
          rawSocket.close().catch(err => {
            log.error('error closing raw socket', err)
          })
        })
      }

      // Already aborted?
      if (options?.signal?.aborted === true) {
        return onAbort()
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
  createListener (options?: WebSocketListenerOptions) {
    return createListener(this.upgrader, options)
  }

  /**
   * Takes a list of `Multiaddr`s and returns only valid Websockets addresses.
   * By default, in a browser environment only DNS+WSS multiaddr is accepted,
   * while in a Node.js environment DNS+{WS, WSS} multiaddrs are accepted.
   */
  filter (multiaddrs: Multiaddr[]) {
    multiaddrs = Array.isArray(multiaddrs) ? multiaddrs : [multiaddrs]

    if (this._filter != null) {
      return this._filter(multiaddrs)
    }

    // Browser
    if (env.isBrowser || env.isWebWorker) {
      return filters.dnsWss(multiaddrs)
    }

    return filters.all(multiaddrs)
  }
}
