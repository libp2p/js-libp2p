import crypto from 'crypto'
import type { Uint8ArrayList } from 'uint8arraylist'

const padding = crypto.constants.RSA_PKCS1_PADDING

export function encrypt (key: JsonWebKey, bytes: Uint8Array | Uint8ArrayList): Uint8Array {
  if (bytes instanceof Uint8Array) {
    // @ts-expect-error node types are missing jwk as a format
    return crypto.publicEncrypt({ format: 'jwk', key, padding }, bytes)
  } else {
    // @ts-expect-error node types are missing jwk as a format
    return crypto.publicEncrypt({ format: 'jwk', key, padding }, bytes.subarray())
  }
}

export function decrypt (key: JsonWebKey, bytes: Uint8Array | Uint8ArrayList): Uint8Array {
  if (bytes instanceof Uint8Array) {
    // @ts-expect-error node types are missing jwk as a format
    return crypto.privateDecrypt({ format: 'jwk', key, padding }, bytes)
  } else {
    // @ts-expect-error node types are missing jwk as a format
    return crypto.privateDecrypt({ format: 'jwk', key, padding }, bytes.subarray())
  }
}
