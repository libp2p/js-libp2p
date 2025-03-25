/**
 * @packageDocumentation
 *
 * ## Supported Key Types
 *
 * Currently the `'RSA'`, `'ed25519'`, and `secp256k1` types are supported, although ed25519 and secp256k1 keys support only signing and verification of messages.
 *
 * For encryption / decryption support, RSA keys should be used.
 */

import { InvalidParametersError, UnsupportedKeyTypeError } from '@libp2p/interface'
import { ECDSAPrivateKey as ECDSAPrivateKeyClass } from './ecdsa/ecdsa.js'
import { ECDSA_P_256_OID, ECDSA_P_384_OID, ECDSA_P_521_OID } from './ecdsa/index.js'
import { generateECDSAKeyPair, pkiMessageToECDSAPrivateKey, pkiMessageToECDSAPublicKey, unmarshalECDSAPrivateKey, unmarshalECDSAPublicKey } from './ecdsa/utils.js'
import { privateKeyLength as ed25519PrivateKeyLength, publicKeyLength as ed25519PublicKeyLength } from './ed25519/index.js'
import { generateEd25519KeyPair, generateEd25519KeyPairFromSeed, unmarshalEd25519PrivateKey, unmarshalEd25519PublicKey } from './ed25519/utils.js'
import * as pb from './keys.js'
import { decodeDer } from './rsa/der.js'
import { RSAES_PKCS1_V1_5_OID } from './rsa/index.js'
import { pkcs1ToRSAPrivateKey, pkixToRSAPublicKey, generateRSAKeyPair, pkcs1MessageToRSAPrivateKey, pkixMessageToRSAPublicKey, jwkToRSAPrivateKey } from './rsa/utils.js'
import { privateKeyLength as secp256k1PrivateKeyLength, publicKeyLength as secp256k1PublicKeyLength } from './secp256k1/index.js'
import { generateSecp256k1KeyPair, unmarshalSecp256k1PrivateKey, unmarshalSecp256k1PublicKey } from './secp256k1/utils.js'
import type { Curve } from './ecdsa/index.js'
import type { PrivateKey, PublicKey, KeyType, RSAPrivateKey, Secp256k1PrivateKey, Ed25519PrivateKey, Secp256k1PublicKey, Ed25519PublicKey, ECDSAPrivateKey, ECDSAPublicKey } from '@libp2p/interface'
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
export async function generateKeyPair (type: 'ECDSA', curve?: Curve): Promise<ECDSAPrivateKey>
export async function generateKeyPair (type: 'RSA', bits?: number): Promise<RSAPrivateKey>
export async function generateKeyPair (type: KeyType, bits?: number): Promise<PrivateKey>
export async function generateKeyPair (type: KeyType, bits?: number | string): Promise<unknown> {
  if (type === 'Ed25519') {
    return generateEd25519KeyPair()
  }

  if (type === 'secp256k1') {
    return generateSecp256k1KeyPair()
  }

  if (type === 'RSA') {
    return generateRSAKeyPair(toBits(bits))
  }

  if (type === 'ECDSA') {
    return generateECDSAKeyPair(toCurve(bits))
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
    case pb.KeyType.ECDSA:
      return unmarshalECDSAPublicKey(data)
    default:
      throw new UnsupportedKeyTypeError()
  }
}

/**
 * Creates a public key from the raw key bytes
 */
export function publicKeyFromRaw (buf: Uint8Array): PublicKey {
  if (buf.byteLength === ed25519PublicKeyLength) {
    return unmarshalEd25519PublicKey(buf)
  } else if (buf.byteLength === secp256k1PublicKeyLength) {
    return unmarshalSecp256k1PublicKey(buf)
  }

  const message = decodeDer(buf)
  const ecdsaOid = message[1]?.[0]

  if (ecdsaOid === ECDSA_P_256_OID || ecdsaOid === ECDSA_P_384_OID || ecdsaOid === ECDSA_P_521_OID) {
    return pkiMessageToECDSAPublicKey(message)
  }

  if (message[0]?.[0] === RSAES_PKCS1_V1_5_OID) {
    return pkixMessageToRSAPublicKey(message, buf)
  }

  throw new InvalidParametersError('Could not extract public key from raw bytes')
}

/**
 * Creates a public key from an identity multihash which contains a protobuf
 * encoded Ed25519 or secp256k1 public key.
 *
 * RSA keys are not supported as in practice we they are not stored in identity
 * multihash since the hash would be very large.
 */
export function publicKeyFromMultihash (digest: MultihashDigest<0x0>): Ed25519PublicKey | Secp256k1PublicKey | ECDSAPublicKey {
  const { Type, Data } = pb.PublicKey.decode(digest.digest)
  const data = Data ?? new Uint8Array()

  switch (Type) {
    case pb.KeyType.Ed25519:
      return unmarshalEd25519PublicKey(data)
    case pb.KeyType.secp256k1:
      return unmarshalSecp256k1PublicKey(data)
    case pb.KeyType.ECDSA:
      return unmarshalECDSAPublicKey(data)
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
export function privateKeyFromProtobuf (buf: Uint8Array): Ed25519PrivateKey | Secp256k1PrivateKey | RSAPrivateKey | ECDSAPrivateKey {
  const decoded = pb.PrivateKey.decode(buf)
  const data = decoded.Data ?? new Uint8Array()

  switch (decoded.Type) {
    case pb.KeyType.RSA:
      return pkcs1ToRSAPrivateKey(data)
    case pb.KeyType.Ed25519:
      return unmarshalEd25519PrivateKey(data)
    case pb.KeyType.secp256k1:
      return unmarshalSecp256k1PrivateKey(data)
    case pb.KeyType.ECDSA:
      return unmarshalECDSAPrivateKey(data)
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
  if (buf.byteLength === ed25519PrivateKeyLength) {
    return unmarshalEd25519PrivateKey(buf)
  } else if (buf.byteLength === secp256k1PrivateKeyLength) {
    return unmarshalSecp256k1PrivateKey(buf)
  }

  const message = decodeDer(buf)
  const ecdsaOid = message[2]?.[0]

  if (ecdsaOid === ECDSA_P_256_OID || ecdsaOid === ECDSA_P_384_OID || ecdsaOid === ECDSA_P_521_OID) {
    return pkiMessageToECDSAPrivateKey(message)
  }

  if (message.length > 8) {
    return pkcs1MessageToRSAPrivateKey(message)
  }

  throw new InvalidParametersError('Could not extract private key from raw bytes')
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

function toBits (bits: any): number {
  if (bits == null) {
    return 2048
  }

  return parseInt(bits, 10)
}

function toCurve (curve: any): Curve {
  if (curve === 'P-256' || curve == null) {
    return 'P-256'
  }

  if (curve === 'P-384') {
    return 'P-384'
  }

  if (curve === 'P-521') {
    return 'P-521'
  }

  throw new InvalidParametersError('Unsupported curve, should be P-256, P-384 or P-521')
}

/**
 * Convert a libp2p RSA or ECDSA private key to a WebCrypto CryptoKeyPair
 */
export async function privateKeyToCryptoKeyPair (privateKey: PrivateKey): Promise<CryptoKeyPair> {
  if (privateKey.type === 'RSA') {
    return {
      privateKey: await crypto.subtle.importKey('jwk', privateKey.jwk, {
        name: 'RSASSA-PKCS1-v1_5',
        hash: { name: 'SHA-256' }
      }, true, ['sign']),
      publicKey: await crypto.subtle.importKey('jwk', privateKey.publicKey.jwk, {
        name: 'RSASSA-PKCS1-v1_5',
        hash: { name: 'SHA-256' }
      }, true, ['verify'])
    }
  }

  if (privateKey.type === 'ECDSA') {
    return {
      privateKey: await crypto.subtle.importKey('jwk', privateKey.jwk, {
        name: 'ECDSA',
        namedCurve: privateKey.jwk.crv ?? 'P-256'
      }, true, ['sign']),
      publicKey: await crypto.subtle.importKey('jwk', privateKey.publicKey.jwk, {
        name: 'ECDSA',
        namedCurve: privateKey.publicKey.jwk.crv ?? 'P-256'
      }, true, ['verify'])
    }
  }

  throw new InvalidParametersError('Only RSA and ECDSA keys are supported')
}

/**
 * Convert a RSA or ECDSA WebCrypto CryptoKeyPair to a libp2p private key
 */
export async function privateKeyFromCryptoKeyPair (keyPair: CryptoKeyPair): Promise<PrivateKey> {
  if (keyPair.privateKey.algorithm.name === 'RSASSA-PKCS1-v1_5') {
    const jwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey)

    return jwkToRSAPrivateKey(jwk)
  }

  if (keyPair.privateKey.algorithm.name === 'ECDSA') {
    const jwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey)

    return new ECDSAPrivateKeyClass(jwk)
  }

  throw new InvalidParametersError('Only RSA and ECDSA keys are supported')
}
