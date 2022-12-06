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
 * import { plaintext } from 'libp2p/insecure'
 *
 * // Create a Uint8Array and write the swarm key to it
 * const swarmKey = new Uint8Array(95)
 * generateKey(swarmKey)
 *
 * const node = await createLibp2p({
 *   // ...other options
 *   connectionEncryption: [plaintext()]
 * })
 * ```
 */

import { logger } from '@libp2p/logger'
import { handshake } from 'it-handshake'
import * as lp from 'it-length-prefixed'
import { UnexpectedPeerError, InvalidCryptoExchangeError } from '@libp2p/interface-connection-encrypter/errors'
import { Exchange, KeyType } from './pb/proto.js'
import type { PeerId } from '@libp2p/interface-peer-id'
import { peerIdFromBytes, peerIdFromKeys } from '@libp2p/peer-id'
import type { ConnectionEncrypter, SecuredConnection } from '@libp2p/interface-connection-encrypter'
import type { Duplex } from 'it-stream-types'
import map from 'it-map'

const log = logger('libp2p:plaintext')
const PROTOCOL = '/plaintext/2.0.0'

function lpEncodeExchange (exchange: Exchange) {
  const pb = Exchange.encode(exchange)

  return lp.encode.single(pb)
}

/**
 * Encrypt connection
 */
async function encrypt (localId: PeerId, conn: Duplex<Uint8Array>, remoteId?: PeerId): Promise<SecuredConnection> {
  const shake = handshake(conn)

  let type = KeyType.RSA

  if (localId.type === 'Ed25519') {
    type = KeyType.Ed25519
  } else if (localId.type === 'secp256k1') {
    type = KeyType.Secp256k1
  }

  // Encode the public key and write it to the remote peer
  shake.write(
    lpEncodeExchange({
      id: localId.toBytes(),
      pubkey: {
        Type: type,
        Data: localId.publicKey ?? new Uint8Array(0)
      }
    }).subarray()
  )

  log('write pubkey exchange to peer %p', remoteId)

  // Get the Exchange message
  // @ts-expect-error needs to be generator
  const response = (await lp.decode.fromReader(shake.reader).next()).value
  const id = Exchange.decode(response)
  log('read pubkey exchange from peer %p', remoteId)

  let peerId
  try {
    if (id.pubkey == null) {
      throw new Error('Public key missing')
    }

    if (id.pubkey.Data.length === 0) {
      throw new Error('Public key data too short')
    }

    if (id.id == null) {
      throw new Error('Remote id missing')
    }

    peerId = await peerIdFromKeys(id.pubkey.Data)

    if (!peerId.equals(peerIdFromBytes(id.id))) {
      throw new Error('Public key did not match id')
    }
  } catch (err: any) {
    log.error(err)
    throw new InvalidCryptoExchangeError('Remote did not provide its public key')
  }

  if (remoteId != null && !peerId.equals(remoteId)) {
    throw new UnexpectedPeerError()
  }

  log('plaintext key exchange completed successfully with peer %p', peerId)

  shake.rest()

  return {
    conn: {
      sink: shake.stream.sink,
      source: map(shake.stream.source, (buf) => buf.subarray())
    },
    remotePeer: peerId
  }
}

class Plaintext implements ConnectionEncrypter {
  public protocol: string = PROTOCOL

  async secureInbound (localId: PeerId, conn: Duplex<Uint8Array>, remoteId?: PeerId): Promise<SecuredConnection> {
    return await encrypt(localId, conn, remoteId)
  }

  async secureOutbound (localId: PeerId, conn: Duplex<Uint8Array>, remoteId?: PeerId): Promise<SecuredConnection> {
    return await encrypt(localId, conn, remoteId)
  }
}

export function plaintext (): () => ConnectionEncrypter {
  return () => new Plaintext()
}
