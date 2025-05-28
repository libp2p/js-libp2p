import { secp256k1 as secp } from '@noble/curves/secp256k1'
import { sha256 } from 'multiformats/hashes/sha2'
import { SigningError, VerificationError } from '../../errors.js'
import { isPromise } from '../../util.js'
import type { AbortOptions } from '@libp2p/interface'
import type { Uint8ArrayList } from 'uint8arraylist'

const PUBLIC_KEY_BYTE_LENGTH = 33
const PRIVATE_KEY_BYTE_LENGTH = 32

export { PUBLIC_KEY_BYTE_LENGTH as publicKeyLength }
export { PRIVATE_KEY_BYTE_LENGTH as privateKeyLength }

/**
 * Hash and sign message with private key
 */
export function hashAndSign (key: Uint8Array, msg: Uint8Array | Uint8ArrayList, options?: AbortOptions): Uint8Array | Promise<Uint8Array> {
  const p = sha256.digest(msg instanceof Uint8Array ? msg : msg.subarray())

  if (isPromise(p)) {
    return p
      .then(({ digest }) => {
        options?.signal?.throwIfAborted()
        return secp.sign(digest, key).toDERRawBytes()
      })
      .catch(err => {
        if (err.name === 'AbortError') {
          throw err
        }

        throw new SigningError(String(err))
      })
  }

  try {
    return secp.sign(p.digest, key).toDERRawBytes()
  } catch (err) {
    throw new SigningError(String(err))
  }
}

/**
 * Hash message and verify signature with public key
 */
export function hashAndVerify (key: Uint8Array, sig: Uint8Array, msg: Uint8Array | Uint8ArrayList, options?: AbortOptions): boolean | Promise<boolean> {
  const p = sha256.digest(msg instanceof Uint8Array ? msg : msg.subarray())

  if (isPromise(p)) {
    return p
      .then(({ digest }) => {
        options?.signal?.throwIfAborted()
        return secp.verify(sig, digest, key)
      })
      .catch(err => {
        if (err.name === 'AbortError') {
          throw err
        }

        throw new VerificationError(String(err))
      })
  }

  try {
    options?.signal?.throwIfAborted()
    return secp.verify(sig, p.digest, key)
  } catch (err) {
    throw new VerificationError(String(err))
  }
}
