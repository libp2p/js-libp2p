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

import { InvalidParametersError, UnsupportedKeyTypeError } from '@libp2p/interface'
import { exportEd25519PrivateKey, generateEd25519KeyPair, generateEd25519KeyPairFromSeed, unmarshalEd25519PrivateKey, unmarshalEd25519PublicKey } from './ed25519-utils.js'
import { importer } from './importer.js'
import * as pb from './keys.js'
import { importFromPem, pkcs1ToRSAPrivateKey, pkixToRSAPublicKey, exportRSAPrivateKey, generateRSAKeyPair } from './rsa-utils.js'
import { exportSecp256k1PrivateKey, generateSecp256k1KeyPair, unmarshalSecp256k1PrivateKey, unmarshalSecp256k1PublicKey } from './secp256k1-utils.js'
import type { PrivateKey, PublicKey, KeyType, RSAPrivateKey, Secp256k1PrivateKey, Ed25519PrivateKey, Secp256k1PublicKey, Ed25519PublicKey } from '@libp2p/interface'
import type { Multibase, MultihashDigest } from 'multiformats'

export { generateEphemeralKeyPair } from './ecdh.js'
export { keyStretcher } from './key-stretcher.js'

/**
 * Generates a keypair of the given type and bitsize
 */
export async function generateKeyPair (type: 'Ed25519'): Promise<Ed25519PrivateKey>
export async function generateKeyPair (type: 'secp256k1'): Promise<Secp256k1PrivateKey>
export async function generateKeyPair (type: 'RSA', bits?: number): Promise<RSAPrivateKey>
export async function generateKeyPair (type: KeyType, bits?: number): Promise<PrivateKey>
export async function generateKeyPair (type: KeyType, bits?: number): Promise<unknown> {
  if (type === 'Ed25519') {
    return generateEd25519KeyPair()
  }

  if (type === 'secp256k1') {
    return generateSecp256k1KeyPair()
  }

  if (type === 'RSA') {
    return generateRSAKeyPair(bits ?? 2048)
  }

  throw new UnsupportedKeyTypeError()
}

/**
 * Generates a keypair of the given type from the passed seed.  Currently only
 * supports Ed25519 keys.
 *
 * Seed is a 32 byte uint8array
 */
export async function generateKeyPairFromSeed (type: 'Ed25519', seed: Uint8Array): Promise<Ed25519PrivateKey>
export async function generateKeyPairFromSeed <T extends KeyType> (type: T, seed: Uint8Array, bits?: number): Promise<never>
export async function generateKeyPairFromSeed (type: string, seed: Uint8Array): Promise<unknown> {
  if (type !== 'Ed25519') {
    throw new UnsupportedKeyTypeError('Seed key derivation only supported for Ed25519 keys')
  }

  return generateEd25519KeyPairFromSeed(seed)
}

/**
 * Converts a protobuf serialized public key into its representative object
 */
export function publicKeyFromProtobuf (buf: Uint8Array): PublicKey {
  const { Type, Data } = pb.PublicKey.decode(buf)
  const data = Data ?? new Uint8Array()

  switch (Type) {
    case pb.KeyType.RSA:
      return pkixToRSAPublicKey(data)
    case pb.KeyType.Ed25519:
      return unmarshalEd25519PublicKey(data)
    case pb.KeyType.secp256k1:
      return unmarshalSecp256k1PublicKey(data)
    default:
      throw new UnsupportedKeyTypeError()
  }
}

/**
 * Creates a public key from the raw key bytes
 */
export function publicKeyFromRaw (buf: Uint8Array): PublicKey {
  if (buf.byteLength === 32) {
    return unmarshalEd25519PublicKey(buf)
  } else if (buf.byteLength === 34) {
    return unmarshalSecp256k1PublicKey(buf)
  } else {
    return pkixToRSAPublicKey(buf)
  }
}

/**
 * Creates a public key from an identity multihash which contains a protobuf
 * encoded Ed25519 or secp256k1 public key.
 *
 * RSA keys are not supported as in practice we they are not stored in identity
 * multihashes since the hash would be very large.
 */
export function publicKeyFromMultihash (digest: MultihashDigest<0x0>): Ed25519PublicKey | Secp256k1PublicKey {
  const { Type, Data } = pb.PublicKey.decode(digest.digest)
  const data = Data ?? new Uint8Array()

  switch (Type) {
    case pb.KeyType.Ed25519:
      return unmarshalEd25519PublicKey(data)
    case pb.KeyType.secp256k1:
      return unmarshalSecp256k1PublicKey(data)
    default:
      throw new UnsupportedKeyTypeError()
  }
}

/**
 * Converts a public key object into a protobuf serialized public key
 */
export function publicKeyToProtobuf (key: PublicKey): Uint8Array {
  return pb.PublicKey.encode({
    Type: pb.KeyType[key.type],
    Data: key.raw
  })
}

/**
 * Converts a protobuf serialized private key into its representative object
 */
export async function privateKeyFromProtobuf (buf: Uint8Array): Promise<Ed25519PrivateKey | Secp256k1PrivateKey | RSAPrivateKey> {
  const decoded = pb.PrivateKey.decode(buf)
  const data = decoded.Data ?? new Uint8Array()

  switch (decoded.Type) {
    case pb.KeyType.RSA:
      return pkcs1ToRSAPrivateKey(data)
    case pb.KeyType.Ed25519:
      return unmarshalEd25519PrivateKey(data)
    case pb.KeyType.secp256k1:
      return unmarshalSecp256k1PrivateKey(data)
    default:
      throw new UnsupportedKeyTypeError()
  }
}

/**
 * Converts a private key object into a protobuf serialized private key
 */
export function privateKeyToProtobuf (key: PrivateKey): Uint8Array {
  return pb.PrivateKey.encode({
    Type: pb.KeyType[key.type],
    Data: key.raw
  })
}

/**
 * Converts an exported private key into its representative object.
 *
 * Supported formats are 'pem' (RSA only) and 'libp2p-key'.
 */
export async function importPrivateKey (encryptedKey: string, password: string): Promise<PrivateKey> {
  try {
    const key = await importer(encryptedKey, password)
    return await privateKeyFromProtobuf(key)
  } catch {
    // Ignore and try the old pem decrypt
  }

  if (!encryptedKey.includes('BEGIN')) {
    throw new InvalidParametersError('Encrypted key was not a libp2p-key or a PEM file')
  }

  return importFromPem(encryptedKey, password)
}

export type ExportFormat = 'pkcs-8' | 'libp2p-key'

/**
 * Converts an exported private key into its representative object.
 *
 * Supported formats are 'pem' (RSA only) and 'libp2p-key'.
 */
export async function exportPrivateKey (key: PrivateKey, password: string, format?: ExportFormat): Promise<Multibase<'m'>> {
  if (key.type === 'RSA') {
    return exportRSAPrivateKey(key, password, format)
  }

  if (key.type === 'Ed25519') {
    return exportEd25519PrivateKey(key, password, format)
  }

  if (key.type === 'secp256k1') {
    return exportSecp256k1PrivateKey(key, password, format)
  }

  throw new UnsupportedKeyTypeError()
}
