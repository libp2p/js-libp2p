import 'node-forge/lib/asn1.js'
import 'node-forge/lib/pbe.js'
import { CodeError } from '@libp2p/interfaces/errors'
// @ts-expect-error types are missing
import forge from 'node-forge/lib/forge.js'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import * as Ed25519 from './ed25519-class.js'
import generateEphemeralKeyPair from './ephemeral-keys.js'
import { importer } from './importer.js'
import { keyStretcher } from './key-stretcher.js'
import * as keysPBM from './keys.js'
import * as RSA from './rsa-class.js'
import * as Secp256k1 from './secp256k1-class.js'
import type { PrivateKey, PublicKey } from '@libp2p/interface-keys'

export { keyStretcher }
export { generateEphemeralKeyPair }
export { keysPBM }

export type KeyTypes = 'RSA' | 'Ed25519' | 'secp256k1'

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

// Generates a keypair of the given type and bitsize
export async function generateKeyPair (type: KeyTypes, bits?: number): Promise<PrivateKey> { // eslint-disable-line require-await
  return typeToKey(type).generateKeyPair(bits ?? 2048)
}

// Generates a keypair of the given type and bitsize
// seed is a 32 byte uint8array
export async function generateKeyPairFromSeed (type: KeyTypes, seed: Uint8Array, bits?: number): Promise<PrivateKey> { // eslint-disable-line require-await
  if (type.toLowerCase() !== 'ed25519') {
    throw new CodeError('Seed key derivation is unimplemented for RSA or secp256k1', 'ERR_UNSUPPORTED_KEY_DERIVATION_TYPE')
  }

  return Ed25519.generateKeyPairFromSeed(seed)
}

// Converts a protobuf serialized public key into its
// representative object
export function unmarshalPublicKey (buf: Uint8Array): PublicKey {
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
      throw unsupportedKey(decoded.Type ?? 'RSA')
  }
}

// Converts a public key object into a protobuf serialized public key
export function marshalPublicKey (key: { bytes: Uint8Array }, type?: string): Uint8Array {
  type = (type ?? 'rsa').toLowerCase()
  typeToKey(type) // check type
  return key.bytes
}

// Converts a protobuf serialized private key into its
// representative object
export async function unmarshalPrivateKey (buf: Uint8Array): Promise<PrivateKey> { // eslint-disable-line require-await
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

// Converts a private key object into a protobuf serialized private key
export function marshalPrivateKey (key: { bytes: Uint8Array }, type?: string): Uint8Array {
  type = (type ?? 'rsa').toLowerCase()
  typeToKey(type) // check type
  return key.bytes
}

/**
 *
 * @param {string} encryptedKey
 * @param {string} password
 */
export async function importKey (encryptedKey: string, password: string): Promise<PrivateKey> { // eslint-disable-line require-await
  try {
    const key = await importer(encryptedKey, password)
    return await unmarshalPrivateKey(key)
  } catch (_) {
    // Ignore and try the old pem decrypt
  }

  // Only rsa supports pem right now
  const key = forge.pki.decryptRsaPrivateKey(encryptedKey, password)
  if (key === null) {
    throw new CodeError('Cannot read the key, most likely the password is wrong or not a RSA key', 'ERR_CANNOT_DECRYPT_PEM')
  }
  let der = forge.asn1.toDer(forge.pki.privateKeyToAsn1(key))
  der = uint8ArrayFromString(der.getBytes(), 'ascii')
  return supportedKeys.rsa.unmarshalRsaPrivateKey(der)
}
