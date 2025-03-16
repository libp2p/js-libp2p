import { InvalidParametersError, InvalidPublicKeyError } from '@libp2p/interface'
import { sha256 } from '@noble/hashes/sha256'
import { create } from 'multiformats/hashes/digest'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import * as pb from '../keys.js'
import { decodeDer, encodeBitString, encodeInteger, encodeSequence } from './der.js'
import { RSAPrivateKey as RSAPrivateKeyClass, RSAPublicKey as RSAPublicKeyClass } from './rsa.js'
import { generateRSAKey, rsaKeySize } from './index.js'
import type { JWKKeyPair } from '../interface.js'
import type { RSAPrivateKey, RSAPublicKey } from '@libp2p/interface'
import type { Digest } from 'multiformats/hashes/digest'

export const MAX_RSA_KEY_SIZE = 8192
const SHA2_256_CODE = 0x12
const MAX_RSA_JWK_SIZE = 1062

const RSA_ALGORITHM_IDENTIFIER = Uint8Array.from([
  0x30, 0x0D, 0x06, 0x09, 0x2A, 0x86, 0x48, 0x86, 0xF7, 0x0D, 0x01, 0x01, 0x01, 0x05, 0x00
])

/**
 * Convert a PKCS#1 in ASN1 DER format to a JWK private key
 */
export function pkcs1ToJwk (bytes: Uint8Array): JsonWebKey {
  const values = decodeDer(bytes)

  return {
    n: uint8ArrayToString(values[1], 'base64url'),
    e: uint8ArrayToString(values[2], 'base64url'),
    d: uint8ArrayToString(values[3], 'base64url'),
    p: uint8ArrayToString(values[4], 'base64url'),
    q: uint8ArrayToString(values[5], 'base64url'),
    dp: uint8ArrayToString(values[6], 'base64url'),
    dq: uint8ArrayToString(values[7], 'base64url'),
    qi: uint8ArrayToString(values[8], 'base64url'),
    kty: 'RSA'
  }
}

/**
 * Convert a JWK private key into PKCS#1 in ASN1 DER format
 */
export function jwkToPkcs1 (jwk: JsonWebKey): Uint8Array {
  if (jwk.n == null || jwk.e == null || jwk.d == null || jwk.p == null || jwk.q == null || jwk.dp == null || jwk.dq == null || jwk.qi == null) {
    throw new InvalidParametersError('JWK was missing components')
  }

  return encodeSequence([
    encodeInteger(Uint8Array.from([0])),
    encodeInteger(uint8ArrayFromString(jwk.n, 'base64url')),
    encodeInteger(uint8ArrayFromString(jwk.e, 'base64url')),
    encodeInteger(uint8ArrayFromString(jwk.d, 'base64url')),
    encodeInteger(uint8ArrayFromString(jwk.p, 'base64url')),
    encodeInteger(uint8ArrayFromString(jwk.q, 'base64url')),
    encodeInteger(uint8ArrayFromString(jwk.dp, 'base64url')),
    encodeInteger(uint8ArrayFromString(jwk.dq, 'base64url')),
    encodeInteger(uint8ArrayFromString(jwk.qi, 'base64url'))
  ]).subarray()
}

/**
 * Convert a PKIX in ASN1 DER format to a JWK public key
 */
export function pkixToJwk (bytes: Uint8Array): JsonWebKey {
  const decoded = decodeDer(bytes, {
    offset: 0
  })

  // this looks fragile but DER is a canonical format so we are safe to have
  // deeply property chains like this
  return {
    kty: 'RSA',
    n: uint8ArrayToString(
      decoded[1][0],
      'base64url'
    ),
    e: uint8ArrayToString(
      decoded[1][1],
      'base64url'
    )
  }
}

/**
 * Convert a JWK public key to PKIX in ASN1 DER format
 */
export function jwkToPkix (jwk: JsonWebKey): Uint8Array {
  if (jwk.n == null || jwk.e == null) {
    throw new InvalidParametersError('JWK was missing components')
  }

  const subjectPublicKeyInfo = encodeSequence([
    RSA_ALGORITHM_IDENTIFIER,
    encodeBitString(
      encodeSequence([
        encodeInteger(uint8ArrayFromString(jwk.n, 'base64url')),
        encodeInteger(uint8ArrayFromString(jwk.e, 'base64url'))
      ])
    )
  ])

  return subjectPublicKeyInfo.subarray()
}

/**
 * Turn PKCS#1 DER bytes to a PrivateKey
 */
export function pkcs1ToRSAPrivateKey (bytes: Uint8Array): RSAPrivateKey {
  const jwk = pkcs1ToJwk(bytes)

  return jwkToRSAPrivateKey(jwk)
}

/**
 * Turn PKIX bytes to a PublicKey
 */
export function pkixToRSAPublicKey (bytes: Uint8Array, digest?: Digest<18, number>): RSAPublicKey {
  if (bytes.byteLength >= MAX_RSA_JWK_SIZE) {
    throw new InvalidPublicKeyError('Key size is too large')
  }

  const jwk = pkixToJwk(bytes)

  if (digest == null) {
    const hash = sha256(pb.PublicKey.encode({
      Type: pb.KeyType.RSA,
      Data: bytes
    }))
    digest = create(SHA2_256_CODE, hash)
  }

  return new RSAPublicKeyClass(jwk, digest)
}

export function jwkToRSAPrivateKey (jwk: JsonWebKey): RSAPrivateKey {
  if (rsaKeySize(jwk) > MAX_RSA_KEY_SIZE) {
    throw new InvalidParametersError('Key size is too large')
  }

  const keys = jwkToJWKKeyPair(jwk)
  const hash = sha256(pb.PublicKey.encode({
    Type: pb.KeyType.RSA,
    Data: jwkToPkix(keys.publicKey)
  }))
  const digest = create(SHA2_256_CODE, hash)

  return new RSAPrivateKeyClass(keys.privateKey, new RSAPublicKeyClass(keys.publicKey, digest))
}

export async function generateRSAKeyPair (bits: number): Promise<RSAPrivateKey> {
  if (bits > MAX_RSA_KEY_SIZE) {
    throw new InvalidParametersError('Key size is too large')
  }

  const keys = await generateRSAKey(bits)
  const hash = sha256(pb.PublicKey.encode({
    Type: pb.KeyType.RSA,
    Data: jwkToPkix(keys.publicKey)
  }))
  const digest = create(SHA2_256_CODE, hash)

  return new RSAPrivateKeyClass(keys.privateKey, new RSAPublicKeyClass(keys.publicKey, digest))
}

/**
 * Takes a jwk key and returns a JWK KeyPair
 */
export function jwkToJWKKeyPair (key: JsonWebKey): JWKKeyPair {
  if (key == null) {
    throw new InvalidParametersError('Missing key parameter')
  }

  return {
    privateKey: key,
    publicKey: {
      kty: key.kty,
      n: key.n,
      e: key.e
    }
  }
}
