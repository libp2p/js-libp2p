import crypto from 'node:crypto'
import { CodeError } from '@libp2p/interface'
import { secp256k1 as secp } from '@noble/curves/secp256k1'
import type { Uint8ArrayList } from 'uint8arraylist'

const PRIVATE_KEY_BYTE_LENGTH = 32

export { PRIVATE_KEY_BYTE_LENGTH as privateKeyLength }

export function generateKey (): Uint8Array {
  return secp.utils.randomPrivateKey()
}

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
    throw new CodeError(String(err), 'ERR_INVALID_INPUT')
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
    throw new CodeError(String(err), 'ERR_INVALID_INPUT')
  }
}

export function compressPublicKey (key: Uint8Array): Uint8Array {
  const point = secp.ProjectivePoint.fromHex(key).toRawBytes(true)
  return point
}

export function decompressPublicKey (key: Uint8Array): Uint8Array {
  const point = secp.ProjectivePoint.fromHex(key).toRawBytes(false)
  return point
}

export function validatePrivateKey (key: Uint8Array): void {
  try {
    secp.getPublicKey(key, true)
  } catch (err) {
    throw new CodeError(String(err), 'ERR_INVALID_PRIVATE_KEY')
  }
}

export function validatePublicKey (key: Uint8Array): void {
  try {
    secp.ProjectivePoint.fromHex(key)
  } catch (err) {
    throw new CodeError(String(err), 'ERR_INVALID_PUBLIC_KEY')
  }
}

export function computePublicKey (privateKey: Uint8Array): Uint8Array {
  try {
    return secp.getPublicKey(privateKey, true)
  } catch (err) {
    throw new CodeError(String(err), 'ERR_INVALID_PRIVATE_KEY')
  }
}
