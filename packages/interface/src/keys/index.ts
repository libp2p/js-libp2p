import type { CID } from 'multiformats/cid'
import type { MultihashDigest } from 'multiformats/hashes/interface'
import type { Uint8ArrayList } from 'uint8arraylist'

export type KeyType = 'RSA' | 'Ed25519' | 'secp256k1'

export interface RSAPublicKey {
  /**
   * The type of this key
   */
  readonly type: 'RSA'

  /**
   * PKIX in ASN1 DER format
   */
  readonly raw: Uint8Array

  /**
   * Returns `true` if the passed object matches this key
   */
  equals(key?: any): boolean

  /**
   * Returns this public key as a Multihash digest.
   *
   * It contains a sha256 hash of the protobuf version of the public key.
   */
  toMultihash(): MultihashDigest<0x12>

  /**
   * Return this public key as a CID encoded with the `libp2p-key` codec
   *
   * The digest contains a sha256 hash of the protobuf version of the public
   * key.
   */
  toCID(): CID<unknown, 0x72, 0x12, 1>

  /**
   * Verify the passed data was signed by the private key corresponding to this
   * public key
   */
  verify(data: Uint8Array | Uint8ArrayList, sig: Uint8Array): boolean | Promise<boolean>

  /**
   * Returns this key as a multihash with base58btc encoding
   */
  toString(): string
}

export interface Ed25519PublicKey {
  /**
   * The type of this key
   */
  readonly type: 'Ed25519'

  /**
   * The raw public key bytes
   */
  readonly raw: Uint8Array

  /**
   * Returns `true` if the passed object matches this key
   */
  equals(key?: any): boolean

  /**
   * Returns this public key as an identity hash containing the protobuf wrapped
   * public key
   */
  toMultihash(): MultihashDigest<0x0>

  /**
   * Return this public key as a CID encoded with the `libp2p-key` codec
   *
   * The digest contains an identity hash containing the protobuf wrapped
   * version of the public key.
   */
  toCID(): CID<unknown, 0x72, 0x0, 1>

  /**
   * Verify the passed data was signed by the private key corresponding to this
   * public key
   */
  verify(data: Uint8Array | Uint8ArrayList, sig: Uint8Array): boolean | Promise<boolean>

  /**
   * Returns this key as a multihash with base58btc encoding
   */
  toString(): string
}

export interface Secp256k1PublicKey {
  /**
   * The type of this key
   */
  readonly type: 'secp256k1'

  /**
   * The raw public key bytes
   */
  readonly raw: Uint8Array

  /**
   * Returns `true` if the passed object matches this key
   */
  equals(key?: any): boolean

  /**
   * Returns this public key as an identity hash containing the protobuf wrapped
   * public key
   */
  toMultihash(): MultihashDigest<0x0>

  /**
   * Return this public key as a CID encoded with the `libp2p-key` codec
   *
   * The digest contains an identity hash containing the protobuf wrapped
   * version of the public key.
   */
  toCID(): CID<unknown, 0x72, 0x0, 1>

  /**
   * Verify the passed data was signed by the private key corresponding to this
   * public key
   */
  verify(data: Uint8Array | Uint8ArrayList, sig: Uint8Array): boolean | Promise<boolean>

  /**
   * Returns this key as a multihash with base58btc encoding
   */
  toString(): string
}

export type PublicKey = RSAPublicKey | Ed25519PublicKey | Secp256k1PublicKey

/**
 * Returns true if the passed argument has type overlap with the `PublicKey`
 * interface. Can be used to disambiguate object types.
 */
export function isPublicKey (key?: any): key is PublicKey {
  if (key == null) {
    return false
  }

  return (key.type === 'RSA' || key.type === 'Ed25519' || key.type === 'secp256k1') &&
    key.raw instanceof Uint8Array &&
    typeof key.equals === 'function' &&
    typeof key.toMultihash === 'function' &&
    typeof key.toCID === 'function' &&
    typeof key.verify === 'function'
}

/**
 * Generic private key interface
 */
export interface RSAPrivateKey {
  /**
   * The type of this key
   */
  readonly type: 'RSA'

  /**
   * The public key that corresponds to this private key
   */
  readonly publicKey: RSAPublicKey

  /**
   * PKIX in ASN1 DER format
   */
  readonly raw: Uint8Array

  /**
   * Returns `true` if the passed object matches this key
   */
  equals(key?: any): boolean

  /**
   * Sign the passed data with this private key and return the signature for
   * later verification
   */
  sign(data: Uint8Array | Uint8ArrayList): Uint8Array | Promise<Uint8Array>
}

export interface Ed25519PrivateKey {
  /**
   * The type of this key
   */
  readonly type: 'Ed25519'

  /**
   * The public key that corresponds to this private key
   */
  readonly publicKey: Ed25519PublicKey

  /**
   * The raw public key bytes
   */
  readonly raw: Uint8Array

  /**
   * Returns `true` if the passed object matches this key
   */
  equals(key?: any): boolean

  /**
   * Sign the passed data with this private key and return the signature for
   * later verification
   */
  sign(data: Uint8Array | Uint8ArrayList): Uint8Array | Promise<Uint8Array>
}

export interface Secp256k1PrivateKey {
  /**
   * The type of this key
   */
  readonly type: 'secp256k1'

  /**
   * The public key that corresponds to this private key
   */
  readonly publicKey: Secp256k1PublicKey

  /**
   * The raw public key bytes
   */
  readonly raw: Uint8Array

  /**
   * Returns `true` if the passed object matches this key
   */
  equals(key?: any): boolean

  /**
   * Sign the passed data with this private key and return the signature for
   * later verification
   */
  sign(data: Uint8Array | Uint8ArrayList): Uint8Array | Promise<Uint8Array>
}

export type PrivateKey = RSAPrivateKey | Ed25519PrivateKey | Secp256k1PrivateKey

/**
 * Returns true if the passed argument has type overlap with the `PrivateKey`
 * interface. Can be used to disambiguate object types.
 */
export function isPrivateKey (key?: any): key is PrivateKey {
  if (key == null) {
    return false
  }

  return (key.type === 'RSA' || key.type === 'Ed25519' || key.type === 'secp256k1') &&
    isPublicKey(key.publicKey) &&
    key.raw instanceof Uint8Array &&
    typeof key.equals === 'function' &&
    typeof key.sign === 'function'
}
