/**
 * @packageDocumentation
 *
 * ## Supported Key Types
 *
 * Currently the `'RSA'`, `'ed25519'`, and `secp256k1` types are supported, although ed25519 and secp256k1 keys support only signing and verification of messages.
 *
 * For encryption / decryption support, RSA keys should be used.
 */

import { UnsupportedKeyTypeError } from '@libp2p/interface'
import { generateEd25519KeyPair, generateEd25519KeyPairFromSeed, unmarshalEd25519PrivateKey, unmarshalEd25519PublicKey } from './ed25519/utils.js'
import * as pb from './keys.js'
import { pkcs1ToRSAPrivateKey, pkixToRSAPublicKey, generateRSAKeyPair } from './rsa/utils.js'
import { generateSecp256k1KeyPair, unmarshalSecp256k1PrivateKey, unmarshalSecp256k1PublicKey } from './secp256k1/utils.js'
import type { PrivateKey, PublicKey, KeyType, RSAPrivateKey, Secp256k1PrivateKey, Ed25519PrivateKey, Secp256k1PublicKey, Ed25519PublicKey } from '@libp2p/interface'
import type { MultihashDigest } from 'multiformats'
import type { Digest } from 'multiformats/hashes/digest'

export { generateEphemeralKeyPair } from './ecdh/index.js'
export type { Curve } from './ecdh/index.js'
export type { ECDHKey, EnhancedKey, EnhancedKeyPair, ECDHKeyPair } from './interface.js'
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
 * Converts a protobuf serialized public key into its representative object.
 *
 * For RSA public keys optionally pass the multihash digest of the public key if
 * it is known. If the digest is omitted it will be calculated which can be
 * expensive.
 *
 * For other key types the digest option is ignored.
 */
export function publicKeyFromProtobuf (buf: Uint8Array, digest?: Digest<18, number>): PublicKey {
  const { Type, Data } = pb.PublicKey.decode(buf)
  const data = Data ?? new Uint8Array()

  switch (Type) {
    case pb.KeyType.RSA:
      return pkixToRSAPublicKey(data, digest)
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
  } else if (buf.byteLength === 33) {
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
 * multihash since the hash would be very large.
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
export function privateKeyFromProtobuf (buf: Uint8Array): Ed25519PrivateKey | Secp256k1PrivateKey | RSAPrivateKey {
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
 * Creates a private key from the raw key bytes. For Ed25519 keys this requires
 * the public key to be appended to the private key otherwise we can't
 * differentiate between Ed25519 and secp256k1 keys as they are the same length.
 */
export function privateKeyFromRaw (buf: Uint8Array): PrivateKey {
  if (buf.byteLength === 64) {
    return unmarshalEd25519PrivateKey(buf)
  } else if (buf.byteLength === 32) {
    return unmarshalSecp256k1PrivateKey(buf)
  } else {
    return pkcs1ToRSAPrivateKey(buf)
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
