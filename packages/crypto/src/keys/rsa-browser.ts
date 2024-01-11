import { CodeError } from '@libp2p/interface'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import randomBytes from '../random-bytes.js'
import webcrypto from '../webcrypto.js'
import * as utils from './rsa-utils.js'
import type { JWKKeyPair } from './interface.js'
import type { Uint8ArrayList } from 'uint8arraylist'

export { utils }

export async function generateKey (bits: number): Promise<JWKKeyPair> {
  const pair = await webcrypto.get().subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: bits,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: { name: 'SHA-256' }
    },
    true,
    ['sign', 'verify']
  )

  const keys = await exportKey(pair)

  return {
    privateKey: keys[0],
    publicKey: keys[1]
  }
}

// Takes a jwk key
export async function unmarshalPrivateKey (key: JsonWebKey): Promise<JWKKeyPair> {
  const privateKey = await webcrypto.get().subtle.importKey(
    'jwk',
    key,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: { name: 'SHA-256' }
    },
    true,
    ['sign']
  )

  const pair = [
    privateKey,
    await derivePublicFromPrivate(key)
  ]

  const keys = await exportKey({
    privateKey: pair[0],
    publicKey: pair[1]
  })

  return {
    privateKey: keys[0],
    publicKey: keys[1]
  }
}

export { randomBytes as getRandomValues }

export async function hashAndSign (key: JsonWebKey, msg: Uint8Array | Uint8ArrayList): Promise<Uint8Array> {
  const privateKey = await webcrypto.get().subtle.importKey(
    'jwk',
    key,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: { name: 'SHA-256' }
    },
    false,
    ['sign']
  )

  const sig = await webcrypto.get().subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    privateKey,
    msg instanceof Uint8Array ? msg : msg.subarray()
  )

  return new Uint8Array(sig, 0, sig.byteLength)
}

export async function hashAndVerify (key: JsonWebKey, sig: Uint8Array, msg: Uint8Array | Uint8ArrayList): Promise<boolean> {
  const publicKey = await webcrypto.get().subtle.importKey(
    'jwk',
    key,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: { name: 'SHA-256' }
    },
    false,
    ['verify']
  )

  return webcrypto.get().subtle.verify(
    { name: 'RSASSA-PKCS1-v1_5' },
    publicKey,
    sig,
    msg instanceof Uint8Array ? msg : msg.subarray()
  )
}

async function exportKey (pair: CryptoKeyPair): Promise<[JsonWebKey, JsonWebKey]> {
  if (pair.privateKey == null || pair.publicKey == null) {
    throw new CodeError('Private and public key are required', 'ERR_INVALID_PARAMETERS')
  }

  return Promise.all([
    webcrypto.get().subtle.exportKey('jwk', pair.privateKey),
    webcrypto.get().subtle.exportKey('jwk', pair.publicKey)
  ])
}

async function derivePublicFromPrivate (jwKey: JsonWebKey): Promise<CryptoKey> {
  return webcrypto.get().subtle.importKey(
    'jwk',
    {
      kty: jwKey.kty,
      n: jwKey.n,
      e: jwKey.e
    },
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: { name: 'SHA-256' }
    },
    true,
    ['verify']
  )
}

export function keySize (jwk: JsonWebKey): number {
  if (jwk.kty !== 'RSA') {
    throw new CodeError('invalid key type', 'ERR_INVALID_KEY_TYPE')
  } else if (jwk.n == null) {
    throw new CodeError('invalid key modulus', 'ERR_INVALID_KEY_MODULUS')
  }
  const bytes = uint8ArrayFromString(jwk.n, 'base64url')
  return bytes.length * 8
}
