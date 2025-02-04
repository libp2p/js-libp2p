import { secp256k1 as secp } from '@noble/curves/secp256k1'
import { sha256 } from 'multiformats/hashes/sha2'
import { SigningError, VerificationError } from '../../errors.js'
import { isPromise } from '../../util.js'
import type { Uint8ArrayList } from 'uint8arraylist'

/**
 * Hash and sign message with private key
 */
export function hashAndSign (key: Uint8Array, msg: Uint8Array | Uint8ArrayList): Uint8Array | Promise<Uint8Array> {
  const p = sha256.digest(msg instanceof Uint8Array ? msg : msg.subarray())

  if (isPromise(p)) {
    return p.then(({ digest }) => secp.sign(digest, key).toDERRawBytes())
      .catch(err => {
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
export function hashAndVerify (key: Uint8Array, sig: Uint8Array, msg: Uint8Array | Uint8ArrayList): boolean | Promise<boolean> {
  const p = sha256.digest(msg instanceof Uint8Array ? msg : msg.subarray())

  if (isPromise(p)) {
    return p.then(({ digest }) => secp.verify(sig, digest, key))
      .catch(err => {
        throw new VerificationError(String(err))
      })
  }

  try {
    return secp.verify(sig, p.digest, key)
  } catch (err) {
    throw new VerificationError(String(err))
  }
}
