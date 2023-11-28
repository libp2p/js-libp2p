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

import { UnexpectedPeerError, InvalidCryptoExchangeError } from '@libp2p/interface'
import { peerIdFromBytes, peerIdFromKeys } from '@libp2p/peer-id'
import { pbStream } from 'it-protobuf-stream'
import { Exchange, KeyType } from './pb/proto.js'
import type { ComponentLogger, Logger, MultiaddrConnection, ConnectionEncrypter, SecuredConnection, PeerId } from '@libp2p/interface'
import type { Duplex } from 'it-stream-types'
import type { Uint8ArrayList } from 'uint8arraylist'

const PROTOCOL = '/plaintext/2.0.0'

export interface PlaintextComponents {
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
  private readonly log: Logger
  private readonly timeout: number

  constructor (components: PlaintextComponents, init: PlaintextInit = {}) {
    this.log = components.logger.forComponent('libp2p:plaintext')
    this.timeout = init.timeout ?? 1000
  }

  async secureInbound <Stream extends Duplex<AsyncGenerator<Uint8Array | Uint8ArrayList>> = MultiaddrConnection> (localId: PeerId, conn: Stream, remoteId?: PeerId): Promise<SecuredConnection<Stream>> {
    return this._encrypt(localId, conn, remoteId)
  }

  async secureOutbound <Stream extends Duplex<AsyncGenerator<Uint8Array | Uint8ArrayList>> = MultiaddrConnection> (localId: PeerId, conn: Stream, remoteId?: PeerId): Promise<SecuredConnection<Stream>> {
    return this._encrypt(localId, conn, remoteId)
  }

  /**
   * Encrypt connection
   */
  async _encrypt <Stream extends Duplex<AsyncGenerator<Uint8Array | Uint8ArrayList>> = MultiaddrConnection> (localId: PeerId, conn: Stream, remoteId?: PeerId): Promise<SecuredConnection<Stream>> {
    const signal = AbortSignal.timeout(this.timeout)
    const pb = pbStream(conn).pb(Exchange)

    let type = KeyType.RSA

    if (localId.type === 'Ed25519') {
      type = KeyType.Ed25519
    } else if (localId.type === 'secp256k1') {
      type = KeyType.Secp256k1
    }

    // Encode the public key and write it to the remote peer
    await pb.write({
      id: localId.toBytes(),
      pubkey: {
        Type: type,
        Data: localId.publicKey ?? new Uint8Array(0)
      }
    }, {
      signal
    })

    this.log('write pubkey exchange to peer %p', remoteId)

    // Get the Exchange message
    const response = await pb.read({
      signal
    })

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
