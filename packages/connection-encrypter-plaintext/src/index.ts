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

import { publicKeyFromRaw } from '@libp2p/crypto/keys'
import { UnexpectedPeerError, InvalidCryptoExchangeError, serviceCapabilities, ProtocolError } from '@libp2p/interface'
import { peerIdFromPublicKey } from '@libp2p/peer-id'
import { pbStream } from 'it-protobuf-stream'
import { equals as uint8ArrayEquals } from 'uint8arrays/equals'
import { Exchange, KeyType } from './pb/proto.js'
import type { ComponentLogger, Logger, MultiaddrConnection, ConnectionEncrypter, SecuredConnection, PeerId, PrivateKey } from '@libp2p/interface'
import type { Duplex } from 'it-stream-types'
import type { Uint8ArrayList } from 'uint8arraylist'

const PROTOCOL = '/plaintext/2.0.0'

export interface PlaintextComponents {
  privateKey: PrivateKey
  logger: ComponentLogger
}

export interface PlaintextInit {
  /**
   * The peer id exchange must complete within this many milliseconds
   * (default: 1000)
   */
  timeout?: number
}

class Plaintext implements ConnectionEncrypter {
  public protocol: string = PROTOCOL
  private readonly privateKey: PrivateKey
  private readonly log: Logger
  private readonly timeout: number

  constructor (components: PlaintextComponents, init: PlaintextInit = {}) {
    this.privateKey = components.privateKey
    this.log = components.logger.forComponent('libp2p:plaintext')
    this.timeout = init.timeout ?? 1000
  }

  readonly [Symbol.toStringTag] = '@libp2p/plaintext'

  readonly [serviceCapabilities]: string[] = [
    '@libp2p/connection-encryption'
  ]

  async secureInbound <Stream extends Duplex<AsyncGenerator<Uint8Array | Uint8ArrayList>> = MultiaddrConnection> (conn: Stream, remoteId?: PeerId): Promise<SecuredConnection<Stream>> {
    return this._encrypt(conn, remoteId)
  }

  async secureOutbound <Stream extends Duplex<AsyncGenerator<Uint8Array | Uint8ArrayList>> = MultiaddrConnection> (conn: Stream, remoteId?: PeerId): Promise<SecuredConnection<Stream>> {
    return this._encrypt(conn, remoteId)
  }

  /**
   * Encrypt connection
   */
  async _encrypt <Stream extends Duplex<AsyncGenerator<Uint8Array | Uint8ArrayList>> = MultiaddrConnection> (conn: Stream, remoteId?: PeerId): Promise<SecuredConnection<Stream>> {
    const signal = AbortSignal.timeout(this.timeout)
    const pb = pbStream(conn).pb(Exchange)

    this.log('write pubkey exchange to peer %p', remoteId)

    const publicKey = this.privateKey.publicKey

    const [
      , response
    ] = await Promise.all([
      // Encode the public key and write it to the remote peer
      pb.write({
        id: publicKey.toMultihash().bytes,
        pubkey: {
          Type: KeyType[publicKey.type],
          Data: publicKey.raw
        }
      }, {
        signal
      }),
      // Get the Exchange message
      pb.read({
        signal
      })
    ])

    let peerId
    try {
      if (response.pubkey == null) {
        throw new ProtocolError('Public key missing')
      }

      if (response.pubkey.Data.byteLength === 0) {
        throw new ProtocolError('Public key data too short')
      }

      if (response.id == null) {
        throw new ProtocolError('Remote id missing')
      }

      const pubKey = publicKeyFromRaw(response.pubkey.Data)
      peerId = peerIdFromPublicKey(pubKey)

      if (!uint8ArrayEquals(peerId.toMultihash().bytes, response.id)) {
        throw new InvalidCryptoExchangeError('Public key did not match id')
      }
    } catch (err: any) {
      this.log.error(err)
      throw new InvalidCryptoExchangeError('Invalid public key - ' + err.message)
    }

    if (remoteId != null && !peerId.equals(remoteId)) {
      throw new UnexpectedPeerError()
    }

    this.log('plaintext key exchange completed successfully with peer %p', peerId)

    return {
      conn: pb.unwrap().unwrap(),
      remotePeer: peerId
    }
  }
}

export function plaintext (init?: PlaintextInit): (components: PlaintextComponents) => ConnectionEncrypter {
  return (components) => new Plaintext(components, init)
}
