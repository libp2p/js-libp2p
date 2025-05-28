import crypto from 'node:crypto'
import { promisify } from 'node:util'
import { InvalidParametersError } from '@libp2p/interface'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import randomBytes from '../../random-bytes.js'
import * as utils from './utils.js'
import type { JWKKeyPair } from '../interface.js'
import type { AbortOptions } from '@libp2p/interface'
import type { Uint8ArrayList } from 'uint8arraylist'

const keypair = promisify(crypto.generateKeyPair)

export const RSAES_PKCS1_V1_5_OID = '1.2.840.113549.1.1.1'

export { utils }

export async function generateRSAKey (bits: number, options?: AbortOptions): Promise<JWKKeyPair> {
  // @ts-expect-error node types are missing jwk as a format
  const key = await keypair('rsa', {
    modulusLength: bits,
    publicKeyEncoding: { type: 'pkcs1', format: 'jwk' },
    privateKeyEncoding: { type: 'pkcs1', format: 'jwk' }
  })
  options?.signal?.throwIfAborted()

  return {
    // @ts-expect-error node types are missing jwk as a format
    privateKey: key.privateKey,
    // @ts-expect-error node types are missing jwk as a format
    publicKey: key.publicKey
  }
}

export { randomBytes as getRandomValues }

export function hashAndSign (key: JsonWebKey, msg: Uint8Array | Uint8ArrayList, options?: AbortOptions): Uint8Array {
  options?.signal?.throwIfAborted()

  const hash = crypto.createSign('RSA-SHA256')

  if (msg instanceof Uint8Array) {
    hash.update(msg)
  } else {
    for (const buf of msg) {
      hash.update(buf)
    }
  }

  // @ts-expect-error node types are missing jwk as a format
  return hash.sign({ format: 'jwk', key })
}

export function hashAndVerify (key: JsonWebKey, sig: Uint8Array, msg: Uint8Array | Uint8ArrayList, options?: AbortOptions): boolean {
  options?.signal?.throwIfAborted()

  const hash = crypto.createVerify('RSA-SHA256')

  if (msg instanceof Uint8Array) {
    hash.update(msg)
  } else {
    for (const buf of msg) {
      hash.update(buf)
    }
  }

  // @ts-expect-error node types are missing jwk as a format
  return hash.verify({ format: 'jwk', key }, sig)
}

export function rsaKeySize (jwk: JsonWebKey): number {
  if (jwk.kty !== 'RSA') {
    throw new InvalidParametersError('Invalid key type')
  } else if (jwk.n == null) {
    throw new InvalidParametersError('Invalid key modulus')
  }
  const modulus = uint8ArrayFromString(jwk.n, 'base64url')
  return modulus.length * 8
}
