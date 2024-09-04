import crypto from 'node:crypto'
import { secp256k1 as secp } from '@noble/curves/secp256k1'
import { SigningError, VerificationError } from '../../errors.js'
import type { Uint8ArrayList } from 'uint8arraylist'

/**
 * Hash and sign message with private key
 */
export function hashAndSign (key: Uint8Array, msg: Uint8Array | Uint8ArrayList): Uint8Array {
  const hash = crypto.createHash('sha256')

  if (msg instanceof Uint8Array) {
    hash.update(msg)
  } else {
    for (const buf of msg) {
      hash.update(buf)
    }
  }

  const digest = hash.digest()

  try {
    const signature = secp.sign(digest, key)
    return signature.toDERRawBytes()
  } catch (err) {
    throw new SigningError(String(err))
  }
}

/**
 * Hash message and verify signature with public key
 */
export function hashAndVerify (key: Uint8Array, sig: Uint8Array, msg: Uint8Array | Uint8ArrayList): boolean {
  const hash = crypto.createHash('sha256')

  if (msg instanceof Uint8Array) {
    hash.update(msg)
  } else {
    for (const buf of msg) {
      hash.update(buf)
    }
  }

  const digest = hash.digest()

  try {
    return secp.verify(sig, digest, key)
  } catch (err) {
    throw new VerificationError(String(err))
  }
}
