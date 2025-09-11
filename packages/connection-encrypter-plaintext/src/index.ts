/**
 * @packageDocumentation
 *
 * A connection encrypter that does no connection encryption and trusts the
 * remote peer to provide the correct PeerId.
 *
 * This should not be used in production and is for research purposes only.
 *
 * @example
 *
 * ```typescript
 * import { createLibp2p } from 'libp2p'
 * import { plaintext } from '@libp2p/plaintext'
 *
 * const node = await createLibp2p({
 *   // ...other options
 *   connectionEncrypters: [
 *     plaintext()
 *   ]
 * })
 * ```
 */

import { publicKeyFromRaw } from '@libp2p/crypto/keys'
import { UnexpectedPeerError, InvalidCryptoExchangeError, serviceCapabilities, ProtocolError } from '@libp2p/interface'
import { peerIdFromPublicKey } from '@libp2p/peer-id'
import { pbStream } from '@libp2p/utils'
import { equals as uint8ArrayEquals } from 'uint8arrays/equals'
import { Exchange, KeyType } from './pb/proto.js'
import type { ComponentLogger, Logger, ConnectionEncrypter, SecuredConnection, PrivateKey, SecureConnectionOptions, MessageStream } from '@libp2p/interface'

const PROTOCOL = '/plaintext/2.0.0'

export interface PlaintextComponents {
  privateKey: PrivateKey
  logger: ComponentLogger
}

class Plaintext implements ConnectionEncrypter {
  public protocol: string = PROTOCOL
  private readonly privateKey: PrivateKey
  private readonly log: Logger

  constructor (components: PlaintextComponents) {
    this.privateKey = components.privateKey
    this.log = components.logger.forComponent('libp2p:plaintext')
  }

  readonly [Symbol.toStringTag] = '@libp2p/plaintext'

  readonly [serviceCapabilities]: string[] = [
    '@libp2p/connection-encryption'
  ]

  async secureInbound (connection: MessageStream, options?: SecureConnectionOptions): Promise<SecuredConnection> {
    return this._encrypt(connection, options)
  }

  async secureOutbound (connection: MessageStream, options?: SecureConnectionOptions): Promise<SecuredConnection> {
    return this._encrypt(connection, options)
  }

  /**
   * Encrypt connection
   */
  async _encrypt (connection: MessageStream, options?: SecureConnectionOptions): Promise<SecuredConnection> {
    const log = connection.log?.newScope('plaintext') ?? this.log
    const pb = pbStream(connection).pb(Exchange)

    log('write pubkey exchange to peer %p', options?.remotePeer)

    const publicKey = this.privateKey.publicKey

    // Encode the public key and write it to the remote peer
    await pb.write({
      id: publicKey.toMultihash().bytes,
      pubkey: {
        Type: KeyType[publicKey.type],
        Data: publicKey.raw
      }
    }, options)

    // Get the Exchange message
    const response = await pb.read(options)

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
      log.error('Invalid public key - %e', err)
      throw new InvalidCryptoExchangeError(`Invalid public key - ${err.message}`)
    }

    if (options?.remotePeer != null && !peerId.equals(options?.remotePeer)) {
      throw new UnexpectedPeerError()
    }

    log('plaintext key exchange completed successfully with peer %p', peerId)

    return {
      connection: pb.unwrap().unwrap(),
      remotePeer: peerId
    }
  }
}

export function plaintext (): (components: PlaintextComponents) => ConnectionEncrypter {
  return (components) => new Plaintext(components)
}
