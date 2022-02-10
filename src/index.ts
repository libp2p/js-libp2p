import net from 'net'
import * as mafmt from '@multiformats/mafmt'
import errCode from 'err-code'
import { logger } from '@libp2p/logger'
import { toMultiaddrConnection } from './socket-to-conn.js'
import { createListener } from './listener.js'
import { multiaddrToNetConfig } from './utils.js'
import { AbortError } from 'abortable-iterator'
import { CODE_CIRCUIT, CODE_P2P } from './constants.js'
import type { Transport, Upgrader, ListenerOptions, Listener } from '@libp2p/interfaces/transport'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { Socket } from 'net'

const log = logger('libp2p:tcp')

/**
 * @typedef {import('multiaddr').Multiaddr} Multiaddr
 * @typedef {import('libp2p-interfaces/src/connection').Connection} Connection
 * @typedef {import('libp2p-interfaces/src/transport/types').Upgrader} Upgrader
 * @typedef {import('libp2p-interfaces/src/transport/types').Listener} Listener
 * @typedef {import('net').Socket} Socket
 */

interface TCPOptions {
  upgrader: Upgrader
}

interface DialOptions {
  signal?: AbortSignal
}

export class TCP implements Transport<DialOptions, ListenerOptions> {
  private readonly _upgrader: Upgrader

  constructor (options: TCPOptions) {
    const { upgrader } = options

    if (upgrader == null) {
      throw new Error('An upgrader must be provided. See https://github.com/libp2p/interface-transport#upgrader.')
    }

    this._upgrader = upgrader
  }

  async dial (ma: Multiaddr, options: DialOptions = {}) {
    const socket = await this._connect(ma, options)

    // Avoid uncaught errors caused by unstable connections
    socket.on('error', err => {
      log('socket error', err)
    })

    const maConn = toMultiaddrConnection(socket, { remoteAddr: ma, signal: options.signal })
    log('new outbound connection %s', maConn.remoteAddr)
    const conn = await this._upgrader.upgradeOutbound(maConn)
    log('outbound connection %s upgraded', maConn.remoteAddr)
    return conn
  }

  async _connect (ma: Multiaddr, options: DialOptions = {}) {
    if (options.signal?.aborted === true) {
      throw new AbortError()
    }

    return await new Promise<Socket>((resolve, reject) => {
      const start = Date.now()
      const cOpts = multiaddrToNetConfig(ma)

      log('dialing %j', cOpts)
      const rawSocket = net.connect(cOpts)

      const onError = (err: Error) => {
        err.message = `connection error ${cOpts.host}:${cOpts.port}: ${err.message}`

        done(err)
      }

      const onTimeout = () => {
        log('connection timeout %s:%s', cOpts.host, cOpts.port)

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
  createListener (options: ListenerOptions = {}): Listener {
    return createListener({ upgrader: this._upgrader, ...options })
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

      return mafmt.TCP.matches(ma.decapsulateCode(CODE_P2P))
    })
  }
}
