/**
 * @packageDocumentation
 *
 * Implements the spec at https://github.com/libp2p/specs/blob/master/tls/tls.md
 *
 * @example
 *
 * ```typescript
 * import { createLibp2p } from 'libp2p'
 * import { tls } from '@libp2p/tls'
 *
 * const node = await createLibp2p({
 *   // ...other options
 *   connectionEncrypters: [
 *     tls()
 *   ]
 * })
 * ```
 */

import { TLSSocket, type TLSSocketOptions, connect } from 'node:tls'
import { serviceCapabilities } from '@libp2p/interface'
import { HandshakeTimeoutError } from './errors.js'
import { generateCertificate, verifyPeerCertificate, itToStream, streamToIt } from './utils.js'
import { PROTOCOL } from './index.js'
import type { TLSComponents } from './index.js'
import type { MultiaddrConnection, ConnectionEncrypter, SecuredConnection, Logger, SecureConnectionOptions, CounterGroup } from '@libp2p/interface'
import type { Duplex } from 'it-stream-types'
import type { Uint8ArrayList } from 'uint8arraylist'

export class TLS implements ConnectionEncrypter {
  public protocol: string = PROTOCOL
  private readonly log: Logger
  private readonly components: TLSComponents
  private readonly metrics: {
    server: {
      events?: CounterGroup
      errors?: CounterGroup
    }
    client: {
      events?: CounterGroup
      errors?: CounterGroup
    }
  }

  constructor (components: TLSComponents) {
    this.log = components.logger.forComponent('libp2p:tls')
    this.components = components
    this.metrics = {
      server: {
        events: components.metrics?.registerCounterGroup('libp2p_tls_server_events_total', {
          label: 'event',
          help: 'Total count of TLS connection encryption events by type'
        }),
        errors: components.metrics?.registerCounterGroup('libp2p_tls_server_errors_total', {
          label: 'event',
          help: 'Total count of TLS connection encryption errors by type'
        })
      },
      client: {
        events: components.metrics?.registerCounterGroup('libp2p_tls_server_events_total', {
          label: 'event',
          help: 'Total count of TLS connection encryption events by type'
        }),
        errors: components.metrics?.registerCounterGroup('libp2p_tls_server_errors_total', {
          label: 'event',
          help: 'Total count of TLS connection encryption errors by type'
        })
      }
    }
  }

  readonly [Symbol.toStringTag] = '@libp2p/tls'

  readonly [serviceCapabilities]: string[] = [
    '@libp2p/connection-encryption'
  ]

  async secureInbound <Stream extends Duplex<AsyncGenerator<Uint8Array | Uint8ArrayList>> = MultiaddrConnection> (conn: Stream, options?: SecureConnectionOptions): Promise<SecuredConnection<Stream>> {
    return this._encrypt(conn, true, options)
  }

  async secureOutbound <Stream extends Duplex<AsyncGenerator<Uint8Array | Uint8ArrayList>> = MultiaddrConnection> (conn: Stream, options?: SecureConnectionOptions): Promise<SecuredConnection<Stream>> {
    return this._encrypt(conn, false, options)
  }

  /**
   * Encrypt connection
   */
  async _encrypt <Stream extends Duplex<AsyncGenerator<Uint8Array | Uint8ArrayList>> = MultiaddrConnection> (conn: Stream, isServer: boolean, options?: SecureConnectionOptions): Promise<SecuredConnection<Stream>> {
    const opts: TLSSocketOptions = {
      ...await generateCertificate(this.components.privateKey),
      isServer,
      // require TLS 1.3 or later
      minVersion: 'TLSv1.3',
      maxVersion: 'TLSv1.3',
      // accept self-signed certificates
      rejectUnauthorized: false
    }

    let socket: TLSSocket

    if (isServer) {
      socket = new TLSSocket(itToStream(conn), {
        ...opts,
        // require clients to send certificates
        requestCert: true
      })
    } else {
      socket = connect({
        socket: itToStream(conn),
        ...opts
      })
    }

    return new Promise<SecuredConnection<Stream>>((resolve, reject) => {
      options?.signal?.addEventListener('abort', () => {
        this.metrics[isServer ? 'server' : 'client'].events?.increment({
          abort: true
        })
        this.metrics[isServer ? 'server' : 'client'].errors?.increment({
          encrypt_abort: true
        })
        socket.emit('error', new HandshakeTimeoutError())
      })

      const verifyRemote = (): void => {
        const remote = socket.getPeerCertificate()

        verifyPeerCertificate(remote.raw, options?.remotePeer, this.log)
          .then(remotePeer => {
            this.log('remote certificate ok, remote peer %p', remotePeer)

            resolve({
              remotePeer,
              conn: {
                ...conn,
                ...streamToIt(socket)
              }
            })
          })
          .catch((err: Error) => {
            this.metrics[isServer ? 'server' : 'client'].errors?.increment({
              verify_peer_certificate: true
            })
            socket.emit('error', err)
          })
      }

      socket.on('error', (err: Error) => {
        this.log.error('error encrypting %s connection - %e', isServer ? 'server' : 'client', err)

        if (err.name !== 'HandshakeTimeoutError') {
          this.metrics[isServer ? 'server' : 'client'].events?.increment({
            error: true
          })
        }

        socket.destroy(err)
        reject(err)
      })
      socket.once('secure', () => {
        this.log('verifying remote certificate')
        this.metrics[isServer ? 'server' : 'client'].events?.increment({
          secure: true
        })
        verifyRemote()
      })
      socket.on('connect', () => {
        this.metrics[isServer ? 'server' : 'client'].events?.increment({
          connect: true
        })
      })
      socket.on('close', () => {
        this.metrics[isServer ? 'server' : 'client'].events?.increment({
          close: true
        })
      })
    })
  }
}
