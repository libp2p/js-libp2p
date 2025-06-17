import crypto from 'node:crypto'
import { secp256k1 as secp } from '@noble/curves/secp256k1'
import { SigningError, VerificationError } from '../../errors.js'
import type { AbortOptions } from '@libp2p/interface'
import type { Uint8ArrayList } from 'uint8arraylist'

const PUBLIC_KEY_BYTE_LENGTH = 33
const PRIVATE_KEY_BYTE_LENGTH = 32

export { PUBLIC_KEY_BYTE_LENGTH as publicKeyLength }
export { PRIVATE_KEY_BYTE_LENGTH as privateKeyLength }

/**
 * Hash and sign message with private key
 */
export function hashAndSign (key: Uint8Array, msg: Uint8Array | Uint8ArrayList, options?: AbortOptions): Uint8Array {
  options?.signal?.throwIfAborted()

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
export function hashAndVerify (key: Uint8Array, sig: Uint8Array, msg: Uint8Array | Uint8ArrayList, options?: AbortOptions): boolean {
  options?.signal?.throwIfAborted()
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
