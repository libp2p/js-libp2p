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
import { UnexpectedPeerError } from '@libp2p/interface'
// @ts-expect-error no types
import itToStream from 'it-to-stream'
// @ts-expect-error no types
import streamToIt from 'stream-to-it'
import { generateCertificate, verifyPeerCertificate } from './utils.js'
import type { ComponentLogger, MultiaddrConnection, ConnectionEncrypter, SecuredConnection, PeerId } from '@libp2p/interface'
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
  // private readonly log: Logger
  // private readonly timeout: number

  // constructor (components: TLSComponents, init: TLSInit = {}) {
  //   this.log = components.logger.forComponent('libp2p:tls')
  //   this.timeout = init.timeout ?? 1000
  // }

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
      // require clients to send certificates
      requestCert: true,
      // accept self-signed certificates from clients
      rejectUnauthorized: false,
      // require TLS 1.3 or later
      minVersion: 'TLSv1.3'
    }

    let socket: TLSSocket

    if (isServer) {
      socket = new TLSSocket(itToStream.duplex(conn), opts)
    } else {
      socket = connect({
        socket: itToStream.duplex(conn),
        ...opts
      })
    }

    return new Promise((resolve, reject) => {
      function verifyRemote (): void {
        const remote = socket.getPeerCertificate()

        verifyPeerCertificate(remote.raw, remoteId)
          .then(remotePeer => {
            if (remoteId?.equals(remotePeer) === false) {
              throw new UnexpectedPeerError()
            }

            const outputStream = streamToIt.duplex(socket)
            conn.source = outputStream.source
            conn.sink = outputStream.sink

            resolve({
              remotePeer,
              conn
            })
          })
          .catch(err => {
            reject(err)
          })
      }

      socket.on('error', err => {
        reject(err)
      })
      socket.on('secure', (evt) => {
        verifyRemote()
      })
    })
  }
}

export function tls (init?: TLSInit): (components: TLSComponents) => ConnectionEncrypter {
  return (components) => new TLS()
}
