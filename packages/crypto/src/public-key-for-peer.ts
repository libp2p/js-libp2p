import { InvalidPublicKeyError } from '@libp2p/interface'
import { sha256 } from 'multiformats/hashes/sha2'
import { equals as uint8ArrayEquals } from 'uint8arrays/equals'
import { publicKeyFromProtobuf } from './dispatch.ts'
import type { CryptoLoaderOptions } from './dispatch.ts'
import type { PeerId, PublicKey } from '@libp2p/interface'

const IDENTITY_CODE = 0x00

/**
 * Returns the public key of a peer, either the passed key, which must derive
 * to the peer's multihash, or the key embedded in the peer id.
 *
 * Throws `InvalidPublicKeyError` for missing, malformed or mismatched keys.
 * `AbortError` and `UnknownCryptoError` (no crypto for the key type) are
 * rethrown unchanged so callers can tell an unsupported key type from a
 * forged one.
 */
export async function publicKeyForPeer (peer: Pick<PeerId, 'publicKey' | 'toMultihash'>, key?: Uint8Array, options?: CryptoLoaderOptions): Promise<PublicKey> {
  options?.signal?.throwIfAborted()

  const bytes = key ?? peer.publicKey

  if (bytes == null) {
    throw new InvalidPublicKeyError('No public key available for peer id')
  }

  // bind the bytes to the peer before decoding them so an unsupported key type
  // can only be reported for a key that really belongs to the peer
  const multihash = peer.toMultihash()

  if (multihash.code === IDENTITY_CODE) {
    if (!uint8ArrayEquals(bytes, multihash.digest)) {
      throw new InvalidPublicKeyError('Public key does not match peer id')
    }
  } else if (multihash.code === sha256.code) {
    const digest = await sha256.digest(bytes)

    if (!uint8ArrayEquals(digest.digest, multihash.digest)) {
      throw new InvalidPublicKeyError('Public key does not match peer id')
    }
  } else {
    throw new InvalidPublicKeyError('Unsupported peer id multihash')
  }

  let publicKey: PublicKey

  try {
    publicKey = await publicKeyFromProtobuf(bytes, options)
  } catch (err: any) {
    if (err.name === 'AbortError' || err.name === 'UnknownCryptoError') {
      throw err
    }

    throw new InvalidPublicKeyError(`Could not decode public key - ${err.message}`)
  }

  if (!uint8ArrayEquals(publicKey.toMultihash().bytes, peer.toMultihash().bytes)) {
    throw new InvalidPublicKeyError('Public key does not match peer id')
  }

  return publicKey
}
