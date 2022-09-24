import net from 'net'
import * as mafmt from '@multiformats/mafmt'
import errCode from 'err-code'
import { logger } from '@libp2p/logger'
import { toMultiaddrConnection } from './socket-to-conn.js'
import { createListener } from './listener.js'
import { multiaddrToNetConfig } from './utils.js'
import { AbortError } from '@libp2p/interfaces/errors'
import { CODE_CIRCUIT, CODE_P2P, CODE_UNIX } from './constants.js'
import { CreateListenerOptions, DialOptions, symbol, Transport } from '@libp2p/interface-transport'
import type { AbortOptions, Multiaddr } from '@multiformats/multiaddr'
import type { Socket, IpcSocketConnectOpts, TcpSocketConnectOpts } from 'net'
import type { Connection } from '@libp2p/interface-connection'

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

export class TCP implements Transport {
  private readonly opts: TCPOptions

  constructor (options: TCPOptions = {}) {
    this.opts = options
  }

  get [symbol] (): true {
    return true
  }

  get [Symbol.toStringTag] () {
    return '@libp2p/tcp'
  }

  async dial (ma: Multiaddr, options: TCPDialOptions): Promise<Connection> {
    options.keepAlive = options.keepAlive ?? true

    const socket = await this._connect(ma, options)

    // Avoid uncaught errors caused by unstable connections
    socket.on('error', err => {
      log('socket error', err)
    })

    const maConn = toMultiaddrConnection(socket, {
      remoteAddr: ma,
      signal: options.signal,
      socketInactivityTimeout: this.opts.outboundSocketInactivityTimeout,
      socketCloseTimeout: this.opts.socketCloseTimeout
    })
    log('new outbound connection %s', maConn.remoteAddr)
    const conn = await options.upgrader.upgradeOutbound(maConn)
    log('outbound connection %s upgraded', maConn.remoteAddr)
    return conn
  }

  async _connect (ma: Multiaddr, options: TCPDialOptions) {
    if (options.signal?.aborted === true) {
      throw new AbortError()
    }

    return await new Promise<Socket>((resolve, reject) => {
      const start = Date.now()
      const cOpts = multiaddrToNetConfig(ma) as (IpcSocketConnectOpts & TcpSocketConnectOpts)
      const cOptsStr = cOpts.path ?? `${cOpts.host ?? ''}:${cOpts.port}`

      log('dialing %j', cOpts)
      const rawSocket = net.connect(cOpts)

      const onError = (err: Error) => {
        err.message = `connection error ${cOptsStr}: ${err.message}`

        done(err)
      }

      const onTimeout = () => {
        log('connection timeout %s', cOptsStr)

        const err = errCode(new Error(`connection timeout after ${Date.now() - start}ms`), 'ERR_CONNECT_TIMEOUT')
        // Note: this will result in onError() being called
        rawSocket.emit('error', err)
      }

      const onConnect = () => {
        log('connection opened %j', cOpts)
        done()
      }

      const onAbort = () => {
        log('connection aborted %j', cOpts)
        rawSocket.destroy()
        done(new AbortError())
      }

      const done = (err?: any) => {
        rawSocket.removeListener('error', onError)
        rawSocket.removeListener('timeout', onTimeout)
        rawSocket.removeListener('connect', onConnect)

        if (options.signal != null) {
          options.signal.removeEventListener('abort', onAbort)
        }

        if (err != null) {
          return reject(err)
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
  createListener (options: TCPCreateListenerOptions) {
    return createListener({
      ...options,
      socketInactivityTimeout: this.opts.inboundSocketInactivityTimeout,
      socketCloseTimeout: this.opts.socketCloseTimeout
    })
  }

  /**
   * Takes a list of `Multiaddr`s and returns only valid TCP addresses
   */
  filter (multiaddrs: Multiaddr[]) {
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
