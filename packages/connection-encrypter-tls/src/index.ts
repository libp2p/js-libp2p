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
import { CodeError } from '@libp2p/interface'
import { generateCertificate, verifyPeerCertificate, itToStream, streamToIt } from './utils.js'
import type { ComponentLogger, MultiaddrConnection, ConnectionEncrypter, SecuredConnection, PeerId, Logger } from '@libp2p/interface'
import type { Duplex } from 'it-stream-types'
import type { Uint8ArrayList } from 'uint8arraylist'

const PROTOCOL = '/tls/1.0.0'

export interface TLSComponents {
  logger: ComponentLogger
}

export interface TLSInit {
  /**
   * The peer id exchange must complete within this many milliseconds
   * (default: 1000)
   */
  timeout?: number
}

class TLS implements ConnectionEncrypter {
  public protocol: string = PROTOCOL
  private readonly log: Logger
  private readonly timeout: number

  constructor (components: TLSComponents, init: TLSInit = {}) {
    this.log = components.logger.forComponent('libp2p:tls')
    this.timeout = init.timeout ?? 1000
  }

  async secureInbound <Stream extends Duplex<AsyncGenerator<Uint8Array | Uint8ArrayList>> = MultiaddrConnection> (localId: PeerId, conn: Stream, remoteId?: PeerId): Promise<SecuredConnection<Stream>> {
    return this._encrypt(localId, conn, false, remoteId)
  }

  async secureOutbound <Stream extends Duplex<AsyncGenerator<Uint8Array | Uint8ArrayList>> = MultiaddrConnection> (localId: PeerId, conn: Stream, remoteId?: PeerId): Promise<SecuredConnection<Stream>> {
    return this._encrypt(localId, conn, true, remoteId)
  }

  /**
   * Encrypt connection
   */
  async _encrypt <Stream extends Duplex<AsyncGenerator<Uint8Array | Uint8ArrayList>> = MultiaddrConnection> (localId: PeerId, conn: Stream, isServer: boolean, remoteId?: PeerId): Promise<SecuredConnection<Stream>> {
    const opts: TLSSocketOptions = {
      ...await generateCertificate(localId),
      isServer,
      // require TLS 1.3 or later
      minVersion: 'TLSv1.3',
      // accept self-signed certificates
      rejectUnauthorized: false
    }

    let socket: TLSSocket

    if (isServer) {
      // @ts-expect-error docs say this is fine?
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

    // @ts-expect-error no other way to prevent the TLS socket readable throwing on destroy?
    socket._readableState.autoDestroy = false

    return new Promise((resolve, reject) => {
      const abortTimeout = setTimeout(() => {
        socket.destroy(new CodeError('Handshake timeout', 'ERR_HANDSHAKE_TIMEOUT'))
      }, this.timeout)

      const verifyRemote = (): void => {
        const remote = socket.getPeerCertificate()

        verifyPeerCertificate(remote.raw, remoteId, this.log)
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
          .catch(err => {
            reject(err)
          })
          .finally(() => {
            clearTimeout(abortTimeout)
          })
      }

      socket.on('error', err => {
        reject(err)
        clearTimeout(abortTimeout)
      })
      socket.on('secure', (evt) => {
        this.log('verifying remote certificate')
        verifyRemote()
      })
    })
  }
}

export function tls (init?: TLSInit): (components: TLSComponents) => ConnectionEncrypter {
  return (components) => new TLS(components, init)
}
