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
 *   connectionEncryption: [
 *     tls()
 *   ]
 * })
 * ```
 */

import { TLSSocket, type TLSSocketOptions, connect } from 'node:tls'
import { CodeError, serviceCapabilities } from '@libp2p/interface'
import { generateCertificate, verifyPeerCertificate, itToStream, streamToIt } from './utils.js'
import { PROTOCOL } from './index.js'
import type { TLSComponents } from './index.js'
import type { MultiaddrConnection, ConnectionEncrypter, SecuredConnection, PeerId, Logger, SecureConnectionOptions } from '@libp2p/interface'
import type { Duplex } from 'it-stream-types'
import type { Uint8ArrayList } from 'uint8arraylist'

export class TLS implements ConnectionEncrypter {
  public protocol: string = PROTOCOL
  private readonly log: Logger

  constructor (components: TLSComponents) {
    this.log = components.logger.forComponent('libp2p:tls')
  }

  readonly [Symbol.toStringTag] = '@libp2p/tls'

  readonly [serviceCapabilities]: string[] = [
    '@libp2p/connection-encryption'
  ]

  async secureInbound <Stream extends Duplex<AsyncGenerator<Uint8Array | Uint8ArrayList>> = MultiaddrConnection> (localId: PeerId, conn: Stream, options?: SecureConnectionOptions): Promise<SecuredConnection<Stream>> {
    return this._encrypt(localId, conn, true, options)
  }

  async secureOutbound <Stream extends Duplex<AsyncGenerator<Uint8Array | Uint8ArrayList>> = MultiaddrConnection> (localId: PeerId, conn: Stream, options?: SecureConnectionOptions): Promise<SecuredConnection<Stream>> {
    return this._encrypt(localId, conn, false, options)
  }

  /**
   * Encrypt connection
   */
  async _encrypt <Stream extends Duplex<AsyncGenerator<Uint8Array | Uint8ArrayList>> = MultiaddrConnection> (localId: PeerId, conn: Stream, isServer: boolean, options?: SecureConnectionOptions): Promise<SecuredConnection<Stream>> {
    const opts: TLSSocketOptions = {
      ...await generateCertificate(localId),
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

    return new Promise((resolve, reject) => {
      options?.signal?.addEventListener('abort', () => {
        socket.destroy(new CodeError('Handshake timeout', 'ERR_HANDSHAKE_TIMEOUT'))
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
      socket.once('secure', (evt) => {
        this.log('verifying remote certificate')
        verifyRemote()
      })
    })
  }
}
