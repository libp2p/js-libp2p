import { serviceCapabilities } from '@libp2p/interface'
import { PROTOCOL } from './index.js'
import type { MultiaddrConnection, ConnectionEncrypter, SecuredConnection, SecureConnectionOptions } from '@libp2p/interface'
import type { Duplex } from 'it-stream-types'
import type { Uint8ArrayList } from 'uint8arraylist'

export class TLS implements ConnectionEncrypter {
  public protocol: string = PROTOCOL

  constructor () {
    throw new Error('TLS encryption is not possible in browsers')
  }

  readonly [Symbol.toStringTag] = '@libp2p/tls'

  readonly [serviceCapabilities]: string[] = [
    '@libp2p/connection-encryption'
  ]

  async secureInbound <Stream extends Duplex<AsyncGenerator<Uint8Array | Uint8ArrayList>> = MultiaddrConnection> (conn: Stream, options?: SecureConnectionOptions): Promise<SecuredConnection<Stream>> {
    throw new Error('TLS encryption is not possible in browsers')
  }

  async secureOutbound <Stream extends Duplex<AsyncGenerator<Uint8Array | Uint8ArrayList>> = MultiaddrConnection> (conn: Stream, options?: SecureConnectionOptions): Promise<SecuredConnection<Stream>> {
    throw new Error('TLS encryption is not possible in browsers')
  }
}
