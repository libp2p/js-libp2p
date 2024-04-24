/**
 * @packageDocumentation
 *
 * **Supported Key Types**
 *
 * The {@link generateKeyPair}, {@link marshalPublicKey}, and {@link marshalPrivateKey} functions accept a string `type` argument.
 *
 * Currently the `'RSA'`, `'ed25519'`, and `secp256k1` types are supported, although ed25519 and secp256k1 keys support only signing and verification of messages.
 *
 * For encryption / decryption support, RSA keys should be used.
 */

import { CodeError } from '@libp2p/interface'
import * as Ed25519 from './ed25519-class.js'
import generateEphemeralKeyPair from './ephemeral-keys.js'
import { importer } from './importer.js'
import { keyStretcher } from './key-stretcher.js'
import * as keysPBM from './keys.js'
import * as RSA from './rsa-class.js'
import { importFromPem } from './rsa-utils.js'
import * as Secp256k1 from './secp256k1-class.js'
import type { PrivateKey, PublicKey, KeyType as KeyTypes } from '@libp2p/interface'

export { keyStretcher }
export { generateEphemeralKeyPair }
export { keysPBM }

export type { KeyTypes }

export { RsaPrivateKey, RsaPublicKey, MAX_RSA_KEY_SIZE } from './rsa-class.js'
export { Ed25519PrivateKey, Ed25519PublicKey } from './ed25519-class.js'
export { Secp256k1PrivateKey, Secp256k1PublicKey } from './secp256k1-class.js'
export type { JWKKeyPair } from './interface.js'

export const supportedKeys = {
  rsa: RSA,
  ed25519: Ed25519,
  secp256k1: Secp256k1
}

function unsupportedKey (type: string): CodeError<Record<string, never>> {
  const supported = Object.keys(supportedKeys).join(' / ')
  return new CodeError(`invalid or unsupported key type ${type}. Must be ${supported}`, 'ERR_UNSUPPORTED_KEY_TYPE')
}

function typeToKey (type: string): typeof RSA | typeof Ed25519 | typeof Secp256k1 {
  type = type.toLowerCase()

  if (type === 'rsa' || type === 'ed25519' || type === 'secp256k1') {
    return supportedKeys[type]
  }

  throw unsupportedKey(type)
}

/**
 * Generates a keypair of the given type and bitsize
 */
export async function generateKeyPair <T extends KeyTypes> (type: T, bits?: number): Promise<PrivateKey<T>> {
  return typeToKey(type).generateKeyPair(bits ?? 2048)
}

/**
 * Generates a keypair of the given type and bitsize.
 *
 * Seed is a 32 byte uint8array
 */
export async function generateKeyPairFromSeed <T extends KeyTypes> (type: T, seed: Uint8Array, bits?: number): Promise<PrivateKey<T>> {
  if (type.toLowerCase() !== 'ed25519') {
    throw new CodeError('Seed key derivation is unimplemented for RSA or secp256k1', 'ERR_UNSUPPORTED_KEY_DERIVATION_TYPE')
  }

  return Ed25519.generateKeyPairFromSeed(seed)
}

/**
 * Converts a protobuf serialized public key into its representative object
 */
export function unmarshalPublicKey <T extends KeyTypes> (buf: Uint8Array): PublicKey<T> {
  const decoded = keysPBM.PublicKey.decode(buf)
  const data = decoded.Data ?? new Uint8Array()

  switch (decoded.Type) {
    case keysPBM.KeyType.RSA:
      return supportedKeys.rsa.unmarshalRsaPublicKey(data)
    case keysPBM.KeyType.Ed25519:
      return supportedKeys.ed25519.unmarshalEd25519PublicKey(data)
    case keysPBM.KeyType.Secp256k1:
      return supportedKeys.secp256k1.unmarshalSecp256k1PublicKey(data)
    default:
      throw unsupportedKey(decoded.Type ?? 'unknown')
  }
}

/**
 * Converts a public key object into a protobuf serialized public key
 */
export function marshalPublicKey (key: { bytes: Uint8Array }, type?: string): Uint8Array {
  type = (type ?? 'rsa').toLowerCase()
  typeToKey(type) // check type
  return key.bytes
}

/**
 * Converts a protobuf serialized private key into its representative object
 */
export async function unmarshalPrivateKey <T extends KeyTypes> (buf: Uint8Array): Promise<PrivateKey<T>> {
  const decoded = keysPBM.PrivateKey.decode(buf)
  const data = decoded.Data ?? new Uint8Array()

  switch (decoded.Type) {
    case keysPBM.KeyType.RSA:
      return supportedKeys.rsa.unmarshalRsaPrivateKey(data)
    case keysPBM.KeyType.Ed25519:
      return supportedKeys.ed25519.unmarshalEd25519PrivateKey(data)
    case keysPBM.KeyType.Secp256k1:
      return supportedKeys.secp256k1.unmarshalSecp256k1PrivateKey(data)
    default:
      throw unsupportedKey(decoded.Type ?? 'RSA')
  }
}

/**
 * Converts a private key object into a protobuf serialized private key
 */
export function marshalPrivateKey (key: { bytes: Uint8Array }, type?: string): Uint8Array {
  type = (type ?? 'rsa').toLowerCase()
  typeToKey(type) // check type
  return key.bytes
}

/**
 * Converts an exported private key into its representative object.
 *
 * Supported formats are 'pem' (RSA only) and 'libp2p-key'.
 */
export async function importKey <T extends KeyTypes> (encryptedKey: string, password: string): Promise<PrivateKey<T>> {
  try {
    const key = await importer(encryptedKey, password)
    return await unmarshalPrivateKey(key)
  } catch (_) {
    // Ignore and try the old pem decrypt
  }

  if (!encryptedKey.includes('BEGIN')) {
    throw new CodeError('Encrypted key was not a libp2p-key or a PEM file', 'ERR_INVALID_IMPORT_FORMAT')
  }

  return importFromPem(encryptedKey, password)
}
