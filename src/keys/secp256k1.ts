import errcode from 'err-code'
import * as secp from '@noble/secp256k1'
import { sha256 } from 'multiformats/hashes/sha2'

const PRIVATE_KEY_BYTE_LENGTH = 32

export { PRIVATE_KEY_BYTE_LENGTH as privateKeyLength }

export function generateKey () {
  return secp.utils.randomPrivateKey()
}

/**
 * Hash and sign message with private key
 */
export async function hashAndSign (key: Uint8Array, msg: Uint8Array) {
  const { digest } = await sha256.digest(msg)
  try {
    return await secp.sign(digest, key)
  } catch (err) {
    throw errcode(err, 'ERR_INVALID_INPUT')
  }
}

/**
 * Hash message and verify signature with public key
 */
export async function hashAndVerify (key: Uint8Array, sig: Uint8Array, msg: Uint8Array) {
  try {
    const { digest } = await sha256.digest(msg)
    return secp.verify(sig, digest, key)
  } catch (err) {
    throw errcode(err, 'ERR_INVALID_INPUT')
  }
}

export function compressPublicKey (key: Uint8Array) {
  const point = secp.Point.fromHex(key).toRawBytes(true)
  return point
}

export function decompressPublicKey (key: Uint8Array) {
  const point = secp.Point.fromHex(key).toRawBytes(false)
  return point
}

export function validatePrivateKey (key: Uint8Array) {
  try {
    secp.getPublicKey(key, true)
  } catch (err) {
    throw errcode(err, 'ERR_INVALID_PRIVATE_KEY')
  }
}

export function validatePublicKey (key: Uint8Array) {
  try {
    secp.Point.fromHex(key)
  } catch (err) {
    throw errcode(err, 'ERR_INVALID_PUBLIC_KEY')
  }
}

export function computePublicKey (privateKey: Uint8Array) {
  try {
    return secp.getPublicKey(privateKey, true)
  } catch (err) {
    throw errcode(err, 'ERR_INVALID_PRIVATE_KEY')
  }
}
