import { InvalidParametersError } from '@libp2p/interface'
import { Ed25519PublicKey as Ed25519PublicKeyClass, Ed25519PrivateKey as Ed25519PrivateKeyClass } from './ed25519.js'
import * as crypto from './index.js'
import type { Ed25519PublicKey, Ed25519PrivateKey } from '@libp2p/interface'

export function unmarshalEd25519PrivateKey (bytes: Uint8Array): Ed25519PrivateKey {
  // Try the old, redundant public key version
  if (bytes.length > crypto.privateKeyLength) {
    bytes = ensureEd25519Key(bytes, crypto.privateKeyLength + crypto.publicKeyLength)
    const privateKeyBytes = bytes.subarray(0, crypto.privateKeyLength)
    const publicKeyBytes = bytes.subarray(crypto.privateKeyLength, bytes.length)
    return new Ed25519PrivateKeyClass(privateKeyBytes, publicKeyBytes)
  }

  bytes = ensureEd25519Key(bytes, crypto.privateKeyLength)
  const privateKeyBytes = bytes.subarray(0, crypto.privateKeyLength)
  const publicKeyBytes = bytes.subarray(crypto.publicKeyLength)
  return new Ed25519PrivateKeyClass(privateKeyBytes, publicKeyBytes)
}

export function unmarshalEd25519PublicKey (bytes: Uint8Array): Ed25519PublicKey {
  bytes = ensureEd25519Key(bytes, crypto.publicKeyLength)
  return new Ed25519PublicKeyClass(bytes)
}

export async function generateEd25519KeyPair (): Promise<Ed25519PrivateKey> {
  const { privateKey, publicKey } = crypto.generateKey()
  return new Ed25519PrivateKeyClass(privateKey, publicKey)
}

export async function generateEd25519KeyPairFromSeed (seed: Uint8Array): Promise<Ed25519PrivateKey> {
  const { privateKey, publicKey } = crypto.generateKeyFromSeed(seed)
  return new Ed25519PrivateKeyClass(privateKey, publicKey)
}

export function ensureEd25519Key (key: Uint8Array, length: number): Uint8Array {
  key = Uint8Array.from(key ?? [])
  if (key.length !== length) {
    throw new InvalidParametersError(`Key must be a Uint8Array of length ${length}, got ${key.length}`)
  }
  return key
}
