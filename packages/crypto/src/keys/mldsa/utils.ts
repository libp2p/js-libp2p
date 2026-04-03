import { InvalidParametersError, UnsupportedKeyTypeError } from '@libp2p/interface'
import { sha256 } from '@noble/hashes/sha2.js'
import { create as createDigest } from 'multiformats/hashes/digest'
import { MLDSAPrivateKey as MLDSAPrivateKeyClass, MLDSAPublicKey as MLDSAPublicKeyClass } from './mldsa.js'
import * as crypto from './index.js'
import * as pb from '../keys.js'
import type { MLDSAPrivateKey, MLDSAPublicKey, MLDSAVariant } from '@libp2p/interface'
import type { Digest } from 'multiformats/hashes/digest'

const SHA2_256_CODE = 0x12
const MLDSA44_PREFIX = 1
const MLDSA65_PREFIX = 2
const MLDSA87_PREFIX = 3

export function variantToPrefix (variant: MLDSAVariant): number {
  switch (variant) {
    case 'MLDSA44': return MLDSA44_PREFIX
    case 'MLDSA65': return MLDSA65_PREFIX
    case 'MLDSA87': return MLDSA87_PREFIX
    default:
      throw new UnsupportedKeyTypeError('Unsupported ML-DSA variant')
  }
}

export function prefixToVariant (prefix: number): MLDSAVariant {
  switch (prefix) {
    case MLDSA44_PREFIX: return 'MLDSA44'
    case MLDSA65_PREFIX: return 'MLDSA65'
    case MLDSA87_PREFIX: return 'MLDSA87'
    default:
      throw new InvalidParametersError('Unknown ML-DSA variant prefix')
  }
}

export function marshalMLDSAPublicKey (variant: MLDSAVariant, publicKey: Uint8Array): Uint8Array {
  const expectedLength = crypto.getMLDSAPublicKeyLength(variant)

  if (publicKey.byteLength !== expectedLength) {
    throw new InvalidParametersError(`ML-DSA public key must be ${expectedLength} bytes, got ${publicKey.byteLength}`)
  }

  const out = new Uint8Array(1 + publicKey.byteLength)
  out[0] = variantToPrefix(variant)
  out.set(publicKey, 1)
  return out
}

export function marshalMLDSAPrivateKey (variant: MLDSAVariant, privateKey: Uint8Array): Uint8Array {
  const expectedLength = crypto.getMLDSAPrivateKeyLength(variant)
  const seedLength = crypto.getMLDSASeedLength(variant)

  if (privateKey.byteLength !== expectedLength && privateKey.byteLength !== seedLength) {
    throw new InvalidParametersError(`ML-DSA private key must be ${expectedLength} or ${seedLength} bytes, got ${privateKey.byteLength}`)
  }

  const out = new Uint8Array(1 + privateKey.byteLength)
  out[0] = variantToPrefix(variant)
  out.set(privateKey, 1)
  return out
}

export function unmarshalMLDSAPublicKeyData (bytes: Uint8Array): { variant: MLDSAVariant, key: Uint8Array } {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength < 2) {
    throw new InvalidParametersError('Invalid ML-DSA public key bytes')
  }

  try {
    const variant = prefixToVariant(bytes[0])
    const key = bytes.subarray(1)
    const expectedLength = crypto.getMLDSAPublicKeyLength(variant)

    if (key.byteLength !== expectedLength) {
      throw new InvalidParametersError(`ML-DSA public key must be ${expectedLength} bytes, got ${key.byteLength}`)
    }

    return { variant, key }
  } catch {}

  for (const variant of crypto.mldsaVariants) {
    if (bytes.byteLength === crypto.getMLDSAPublicKeyLength(variant)) {
      return {
        variant,
        key: bytes
      }
    }
  }

  throw new InvalidParametersError('Invalid ML-DSA public key bytes')
}

export function unmarshalMLDSAPrivateKeyData (bytes: Uint8Array): { variant: MLDSAVariant, key: Uint8Array } {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength < 2) {
    throw new InvalidParametersError('Invalid ML-DSA private key bytes')
  }

  try {
    const variant = prefixToVariant(bytes[0])
    const key = bytes.subarray(1)
    const expectedLength = crypto.getMLDSAPrivateKeyLength(variant)
    const seedLength = crypto.getMLDSASeedLength(variant)

    if (key.byteLength !== expectedLength && key.byteLength !== seedLength) {
      throw new InvalidParametersError(`ML-DSA private key must be ${expectedLength} or ${seedLength} bytes, got ${key.byteLength}`)
    }

    return { variant, key }
  } catch {}

  for (const variant of crypto.mldsaVariants) {
    if (bytes.byteLength === crypto.getMLDSAPrivateKeyLength(variant)) {
      return {
        variant,
        key: bytes
      }
    }
  }

  throw new InvalidParametersError('Invalid ML-DSA private key bytes')
}

export function createMLDSAPublicKeyDigest (variant: MLDSAVariant, publicKey: Uint8Array): Digest<0x12, number> {
  const hash = sha256(pb.PublicKey.encode({
    Type: pb.KeyType.MLDSA,
    Data: marshalMLDSAPublicKey(variant, publicKey)
  }))

  return createDigest(SHA2_256_CODE, hash)
}

export function unmarshalMLDSAPublicKey (bytes: Uint8Array): MLDSAPublicKey {
  const { variant, key } = unmarshalMLDSAPublicKeyData(bytes)
  return new MLDSAPublicKeyClass(variant, key, createMLDSAPublicKeyDigest(variant, key))
}

export function unmarshalMLDSAPrivateKey (bytes: Uint8Array): MLDSAPrivateKey {
  const { variant, key } = unmarshalMLDSAPrivateKeyData(bytes)
  const publicKey = crypto.getPublicKeyFromPrivateKey(variant, key)
  const digest = createMLDSAPublicKeyDigest(variant, publicKey)
  return new MLDSAPrivateKeyClass(variant, key, new MLDSAPublicKeyClass(variant, publicKey, digest))
}

export async function generateMLDSAKeyPair (variant: MLDSAVariant = crypto.defaultMLDSAVariant): Promise<MLDSAPrivateKey> {
  const keyPair = crypto.generateKey(variant)
  const digest = createMLDSAPublicKeyDigest(variant, keyPair.publicKey)
  return new MLDSAPrivateKeyClass(variant, keyPair.privateKey, new MLDSAPublicKeyClass(variant, keyPair.publicKey, digest))
}
