import crypto from 'crypto'
import { promisify } from 'util'
import { CodeError } from '@libp2p/interfaces/errors'
import randomBytes from '../random-bytes.js'
import * as utils from './rsa-utils.js'
import type { JWKKeyPair } from './interface.js'

const keypair = promisify(crypto.generateKeyPair)

export { utils }

export async function generateKey (bits: number): Promise<JWKKeyPair> { // eslint-disable-line require-await
  // @ts-expect-error node types are missing jwk as a format
  const key = await keypair('rsa', {
    modulusLength: bits,
    publicKeyEncoding: { type: 'pkcs1', format: 'jwk' },
    privateKeyEncoding: { type: 'pkcs1', format: 'jwk' }
  })

  return {
    // @ts-expect-error node types are missing jwk as a format
    privateKey: key.privateKey,
    // @ts-expect-error node types are missing jwk as a format
    publicKey: key.publicKey
  }
}

// Takes a jwk key
export async function unmarshalPrivateKey (key: JsonWebKey): Promise<JWKKeyPair> { // eslint-disable-line require-await
  if (key == null) {
    throw new CodeError('Missing key parameter', 'ERR_MISSING_KEY')
  }
  return {
    privateKey: key,
    publicKey: {
      kty: key.kty,
      n: key.n,
      e: key.e
    }
  }
}

export { randomBytes as getRandomValues }

export async function hashAndSign (key: JsonWebKey, msg: Uint8Array) { // eslint-disable-line require-await
  return crypto.createSign('RSA-SHA256')
    .update(msg)
    // @ts-expect-error node types are missing jwk as a format
    .sign({ format: 'jwk', key })
}

export async function hashAndVerify (key: JsonWebKey, sig: Uint8Array, msg: Uint8Array) { // eslint-disable-line require-await
  return crypto.createVerify('RSA-SHA256')
    .update(msg)
    // @ts-expect-error node types are missing jwk as a format
    .verify({ format: 'jwk', key }, sig)
}

const padding = crypto.constants.RSA_PKCS1_PADDING

export function encrypt (key: JsonWebKey, bytes: Uint8Array) {
  // @ts-expect-error node types are missing jwk as a format
  return crypto.publicEncrypt({ format: 'jwk', key, padding }, bytes)
}

export function decrypt (key: JsonWebKey, bytes: Uint8Array) {
  // @ts-expect-error node types are missing jwk as a format
  return crypto.privateDecrypt({ format: 'jwk', key, padding }, bytes)
}
