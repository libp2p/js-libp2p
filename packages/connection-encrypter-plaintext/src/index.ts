/**
 * @packageDocumentation
 *
 * A connection encrypter that does no connection encryption.
 *
 * This should not be used in production should be used for research purposes only.
 *
 * @example
 *
 * ```typescript
 * import { createLibp2p } from 'libp2p'
 * import { plaintext } from '@libp2p/plaintext'
 *
 * const node = await createLibp2p({
 *   // ...other options
 *   connectionEncryption: [
 *     plaintext()
 *   ]
 * })
 * ```
 */

import { UnexpectedPeerError, InvalidCryptoExchangeError, serviceCapabilities } from '@libp2p/interface'
import { peerIdFromBytes, peerIdFromKeys } from '@libp2p/peer-id'
import { pbStream } from 'it-protobuf-stream'
import { Exchange, KeyType } from './pb/proto.js'
import type { ComponentLogger, Logger, MultiaddrConnection, ConnectionEncrypter, SecuredConnection, PeerId, SecureConnectionOptions } from '@libp2p/interface'
import type { Duplex } from 'it-stream-types'
import type { Uint8ArrayList } from 'uint8arraylist'

const PROTOCOL = '/plaintext/2.0.0'

export interface PlaintextComponents {
  peerId: PeerId
  logger: ComponentLogger
}

class Plaintext implements ConnectionEncrypter {
  public protocol: string = PROTOCOL
  private readonly peerId: PeerId
  private readonly log: Logger

  constructor (components: PlaintextComponents) {
    this.peerId = components.peerId
    this.log = components.logger.forComponent('libp2p:plaintext')
  }

  readonly [Symbol.toStringTag] = '@libp2p/plaintext'

  readonly [serviceCapabilities]: string[] = [
    '@libp2p/connection-encryption'
  ]

  async secureInbound <Stream extends Duplex<AsyncGenerator<Uint8Array | Uint8ArrayList>> = MultiaddrConnection> (conn: Stream, options?: SecureConnectionOptions): Promise<SecuredConnection<Stream>> {
    return this._encrypt(this.peerId, conn, options)
  }

  async secureOutbound <Stream extends Duplex<AsyncGenerator<Uint8Array | Uint8ArrayList>> = MultiaddrConnection> (conn: Stream, options?: SecureConnectionOptions): Promise<SecuredConnection<Stream>> {
    return this._encrypt(this.peerId, conn, options)
  }

  /**
   * Encrypt connection
   */
  async _encrypt <Stream extends Duplex<AsyncGenerator<Uint8Array | Uint8ArrayList>> = MultiaddrConnection> (localId: PeerId, conn: Stream, options?: SecureConnectionOptions): Promise<SecuredConnection<Stream>> {
    const pb = pbStream(conn).pb(Exchange)

    let type = KeyType.RSA

    if (localId.type === 'Ed25519') {
      type = KeyType.Ed25519
    } else if (localId.type === 'secp256k1') {
      type = KeyType.Secp256k1
    }

    this.log('write pubkey exchange to peer %p', options?.remotePeer)

    const [
      , response
    ] = await Promise.all([
      // Encode the public key and write it to the remote peer
      pb.write({
        id: localId.toBytes(),
        pubkey: {
          Type: type,
          Data: localId.publicKey ?? new Uint8Array(0)
        }
      }, options),
      // Get the Exchange message
      pb.read(options)
    ])

    let peerId
    try {
      if (response.pubkey == null) {
        throw new Error('Public key missing')
      }

      if (response.pubkey.Data.length === 0) {
        throw new Error('Public key data too short')
      }

      if (response.id == null) {
        throw new Error('Remote id missing')
      }

      peerId = await peerIdFromKeys(response.pubkey.Data)

      if (!peerId.equals(peerIdFromBytes(response.id))) {
        throw new Error('Public key did not match id')
      }
    } catch (err: any) {
      this.log.error(err)
      throw new InvalidCryptoExchangeError('Remote did not provide its public key')
    }

    if (options?.remotePeer != null && !peerId.equals(options?.remotePeer)) {
      throw new UnexpectedPeerError()
    }

    this.log('plaintext key exchange completed successfully with peer %p', peerId)

    return {
      conn: pb.unwrap().unwrap(),
      remotePeer: peerId
    }
  }
}

export function plaintext (): (components: PlaintextComponents) => ConnectionEncrypter {
  return (components) => new Plaintext(components)
}
