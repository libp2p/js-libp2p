import { serviceCapabilities } from '@libp2p/interface'
import { PROTOCOL } from './index.js'
import type { MultiaddrConnection, ConnectionEncrypter, SecuredConnection, SecureConnectionOptions, MessageStream } from '@libp2p/interface'

export class TLS implements ConnectionEncrypter {
  public protocol: string = PROTOCOL

  constructor () {
    throw new Error('TLS encryption is not possible in browsers')
  }

  readonly [Symbol.toStringTag] = '@libp2p/tls'

  readonly [serviceCapabilities]: string[] = [
    '@libp2p/connection-encryption'
  ]

  async secureInbound <Stream extends MessageStream = MultiaddrConnection> (conn: Stream, options?: SecureConnectionOptions): Promise<SecuredConnection<Stream>> {
    throw new Error('TLS encryption is not possible in browsers')
  }

  async secureOutbound <Stream extends MessageStream = MultiaddrConnection> (conn: Stream, options?: SecureConnectionOptions): Promise<SecuredConnection<Stream>> {
    throw new Error('TLS encryption is not possible in browsers')
  }
}
