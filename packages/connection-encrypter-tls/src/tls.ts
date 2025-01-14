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
import type { MultiaddrConnection, ConnectionEncrypter, SecuredConnection, Logger, SecureConnectionOptions, PrivateKey } from '@libp2p/interface'
import type { Duplex } from 'it-stream-types'
import type { Uint8ArrayList } from 'uint8arraylist'

export class TLS implements ConnectionEncrypter {
  public protocol: string = PROTOCOL
  private readonly log: Logger
  private readonly privateKey: PrivateKey

  constructor (components: TLSComponents) {
    this.log = components.logger.forComponent('libp2p:tls')
    this.privateKey = components.privateKey
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
      ...await generateCertificate(this.privateKey),
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
        const err = new HandshakeTimeoutError()
        socket.destroy(err)
        reject(err)
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
            reject(err)
          })
      }

      socket.on('error', (err: Error) => {
        reject(err)
      })
      socket.once('secure', () => {
        this.log('verifying remote certificate')
        verifyRemote()
      })
    })
      .catch(err => {
        socket.destroy(err)
        throw err
      })
  }
}
