import { ed25519 as ed } from '@noble/curves/ed25519'
import { toString as uint8arrayToString } from 'uint8arrays/to-string'
import crypto from '../../webcrypto/index.js'
import type { Uint8ArrayKeyPair } from '../interface.js'
import type { Uint8ArrayList } from 'uint8arraylist'

const PUBLIC_KEY_BYTE_LENGTH = 32
const PRIVATE_KEY_BYTE_LENGTH = 64 // private key is actually 32 bytes but for historical reasons we concat private and public keys
const KEYS_BYTE_LENGTH = 32

export { PUBLIC_KEY_BYTE_LENGTH as publicKeyLength }
export { PRIVATE_KEY_BYTE_LENGTH as privateKeyLength }

// memoize support result to skip additional awaits every time we use an ed key
let ed25519Supported: boolean | undefined
const webCryptoEd25519SupportedPromise = (async () => {
  try {
    await crypto.get().subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify'])
    return true
  } catch {
    return false
  }
})()

export function generateKey (): Uint8ArrayKeyPair {
  // the actual private key (32 bytes)
  const privateKeyRaw = ed.utils.randomPrivateKey()
  const publicKey = ed.getPublicKey(privateKeyRaw)

  // concatenated the public key to the private key
  const privateKey = concatKeys(privateKeyRaw, publicKey)

  return {
    privateKey,
    publicKey
  }
}

export function generateKeyFromSeed (seed: Uint8Array): Uint8ArrayKeyPair {
  if (seed.length !== KEYS_BYTE_LENGTH) {
    throw new TypeError('"seed" must be 32 bytes in length.')
  } else if (!(seed instanceof Uint8Array)) {
    throw new TypeError('"seed" must be a node.js Buffer, or Uint8Array.')
  }

  // based on node forges algorithm, the seed is used directly as private key
  const privateKeyRaw = seed
  const publicKey = ed.getPublicKey(privateKeyRaw)

  const privateKey = concatKeys(privateKeyRaw, publicKey)

  return {
    privateKey,
    publicKey
  }
}

async function hashAndSignWebCrypto (privateKey: Uint8Array, msg: Uint8Array | Uint8ArrayList): Promise<Uint8Array> {
  let privateKeyRaw: Uint8Array
  if (privateKey.length === PRIVATE_KEY_BYTE_LENGTH) {
    privateKeyRaw = privateKey.subarray(0, 32)
  } else {
    privateKeyRaw = privateKey
  }

  const jwk: JsonWebKey = {
    crv: 'Ed25519',
    kty: 'OKP',
    x: uint8arrayToString(privateKey.subarray(32), 'base64url'),
    d: uint8arrayToString(privateKeyRaw, 'base64url'),
    ext: true,
    key_ops: ['sign']
  }

  const key = await crypto.get().subtle.importKey('jwk', jwk, { name: 'Ed25519' }, true, ['sign'])
  const sig = await crypto.get().subtle.sign({ name: 'Ed25519' }, key, msg instanceof Uint8Array ? msg : msg.subarray())

  return new Uint8Array(sig, 0, sig.byteLength)
}

function hashAndSignNoble (privateKey: Uint8Array, msg: Uint8Array | Uint8ArrayList): Uint8Array {
  const privateKeyRaw = privateKey.subarray(0, KEYS_BYTE_LENGTH)

  return ed.sign(msg instanceof Uint8Array ? msg : msg.subarray(), privateKeyRaw)
}

export async function hashAndSign (privateKey: Uint8Array, msg: Uint8Array | Uint8ArrayList): Promise<Uint8Array> {
  if (ed25519Supported == null) {
    ed25519Supported = await webCryptoEd25519SupportedPromise
  }

  if (ed25519Supported) {
    return hashAndSignWebCrypto(privateKey, msg)
  }

  return hashAndSignNoble(privateKey, msg)
}

async function hashAndVerifyWebCrypto (publicKey: Uint8Array, sig: Uint8Array, msg: Uint8Array | Uint8ArrayList): Promise<boolean> {
  if (publicKey.buffer instanceof ArrayBuffer) {
    const key = await crypto.get().subtle.importKey('raw', publicKey.buffer, { name: 'Ed25519' }, false, ['verify'])
    const isValid = await crypto.get().subtle.verify({ name: 'Ed25519' }, key, sig, msg instanceof Uint8Array ? msg : msg.subarray())
    return isValid
  }

  throw new TypeError('WebCrypto does not support SharedArrayBuffer for Ed25519 keys')
}

function hashAndVerifyNoble (publicKey: Uint8Array, sig: Uint8Array, msg: Uint8Array | Uint8ArrayList): boolean {
  return ed.verify(sig, msg instanceof Uint8Array ? msg : msg.subarray(), publicKey)
}

export async function hashAndVerify (publicKey: Uint8Array, sig: Uint8Array, msg: Uint8Array | Uint8ArrayList): Promise<boolean> {
  if (ed25519Supported == null) {
    ed25519Supported = await webCryptoEd25519SupportedPromise
  }

  if (ed25519Supported) {
    return hashAndVerifyWebCrypto(publicKey, sig, msg)
  }

  return hashAndVerifyNoble(publicKey, sig, msg)
}

function concatKeys (privateKeyRaw: Uint8Array, publicKey: Uint8Array): Uint8Array {
  const privateKey = new Uint8Array(PRIVATE_KEY_BYTE_LENGTH)
  for (let i = 0; i < KEYS_BYTE_LENGTH; i++) {
    privateKey[i] = privateKeyRaw[i]
    privateKey[KEYS_BYTE_LENGTH + i] = publicKey[i]
  }
  return privateKey
}
