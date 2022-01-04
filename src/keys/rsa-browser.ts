import webcrypto from '../webcrypto.js'
import randomBytes from '../random-bytes.js'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import * as utils from './rsa-utils.js'
import { jwk2pub, jwk2priv } from './jwk2pem.js'
import errcode from 'err-code'

export { utils }

export async function generateKey (bits: number) {
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
export async function unmarshalPrivateKey (key: JsonWebKey) {
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

export async function hashAndSign (key: JsonWebKey, msg: Uint8Array) {
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
    Uint8Array.from(msg)
  )

  return new Uint8Array(sig, 0, sig.byteLength)
}

export async function hashAndVerify (key: JsonWebKey, sig: Uint8Array, msg: Uint8Array) {
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

  return await webcrypto.get().subtle.verify(
    { name: 'RSASSA-PKCS1-v1_5' },
    publicKey,
    sig,
    msg
  )
}

async function exportKey (pair: CryptoKeyPair) {
  if (pair.privateKey == null || pair.publicKey == null) {
    throw errcode(new Error('Private and public key are required'), 'ERR_INVALID_PARAMETERS')
  }

  return await Promise.all([
    webcrypto.get().subtle.exportKey('jwk', pair.privateKey),
    webcrypto.get().subtle.exportKey('jwk', pair.publicKey)
  ])
}

async function derivePublicFromPrivate (jwKey: JsonWebKey) {
  return await webcrypto.get().subtle.importKey(
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

/*

RSA encryption/decryption for the browser with webcrypto workaround
"bloody dark magic. webcrypto's why."

Explanation:
  - Convert JWK to nodeForge
  - Convert msg Uint8Array to nodeForge buffer: ByteBuffer is a "binary-string backed buffer", so let's make our Uint8Array a binary string
  - Convert resulting nodeForge buffer to Uint8Array: it returns a binary string, turn that into a Uint8Array

*/

function convertKey (key: JsonWebKey, pub: boolean, msg: Uint8Array, handle: (msg: string, key: { encrypt: (msg: string) => string, decrypt: (msg: string) => string}) => string) {
  const fkey = pub ? jwk2pub(key) : jwk2priv(key)
  const fmsg = uint8ArrayToString(Uint8Array.from(msg), 'ascii')
  const fomsg = handle(fmsg, fkey)
  return uint8ArrayFromString(fomsg, 'ascii')
}

export function encrypt (key: JsonWebKey, msg: Uint8Array) {
  return convertKey(key, true, msg, (msg, key) => key.encrypt(msg))
}

export function decrypt (key: JsonWebKey, msg: Uint8Array) {
  return convertKey(key, false, msg, (msg, key) => key.decrypt(msg))
}
