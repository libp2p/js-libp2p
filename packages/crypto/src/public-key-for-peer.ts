import { InvalidPublicKeyError } from '@libp2p/interface'
import { equals as uint8ArrayEquals } from 'uint8arrays/equals'
import { publicKeyFromProtobuf } from './dispatch.ts'
import type { CryptoLoaderOptions } from './dispatch.ts'
import type { PeerId, PublicKey } from '@libp2p/interface'

/**
 * Returns the public key of a peer, either the passed key, which must derive
 * to the peer's multihash, or the key embedded in the peer id
 */
export async function publicKeyForPeer (peer: Pick<PeerId, 'publicKey' | 'toMultihash'>, key?: Uint8Array, options?: CryptoLoaderOptions): Promise<PublicKey> {
  options?.signal?.throwIfAborted()

  const bytes = key ?? peer.publicKey

  if (bytes == null) {
    throw new InvalidPublicKeyError('No public key available for peer id')
  }

  let publicKey: PublicKey

  try {
    publicKey = await publicKeyFromProtobuf(bytes, options)
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw err
    }

    throw new InvalidPublicKeyError(`Could not decode public key - ${err.message}`)
  }

  if (!uint8ArrayEquals(publicKey.toMultihash().bytes, peer.toMultihash().bytes)) {
    throw new InvalidPublicKeyError('Public key does not match peer id')
  }

  return publicKey
}
