import type { CID } from 'multiformats/cid'
import type { MultihashDigest } from 'multiformats/hashes/interface'
import type { Uint8ArrayList } from 'uint8arraylist'

export type KeyType = 'RSA' | 'Ed25519' | 'secp256k1'

interface PublicKeyBase<KeyType extends string, DigestCode extends number = number> {
  /**
   * The type of this key
   */
  readonly type: KeyType

  /**
   * The raw public key bytes (for Ed25519 and secp256k1 keys) or PKIX in ASN1
   * DER format (for RSA keys)
   */
  readonly raw: Uint8Array

  /**
   * Returns `true` if the passed object matches this key
   */
  equals(key?: any): boolean

  /**
   * Returns this public key as a Multihash digest.
   *
   * It contains either an identity hash containing the protobuf version of the
   * public key (for Ed25519 and secp256k1 keys) or a sha256 hash of the
   * protobuf version of the public key (RSA keys).
   */
  toMultihash(): MultihashDigest<DigestCode>

  /**
   * Return this public key as a CID encoded with the `libp2p-key` codec
   *
   * The digest contains either an identity hash containing the protobuf version
   * of the public key (for Ed25519 and secp256k1 keys) or a sha256 hash of the
   * protobuf version of the public key (RSA keys).
   */
  toCID(): CID<unknown, 0x72, DigestCode, 1>

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

export interface RSAPublicKey extends PublicKeyBase<'RSA', 0x12> {}
export interface Ed25519PublicKey extends PublicKeyBase<'Ed25519', 0x0> {}
export interface Secp256k1PublicKey extends PublicKeyBase<'secp256k1', 0x0> {}
export type PublicKey = RSAPublicKey | Ed25519PublicKey | Secp256k1PublicKey

/**
 * Generic private key interface
 */
interface PrivateKeyBase<KeyType extends string, PublicKeyType extends PublicKeyBase<KeyType>> {
  /**
   * The type of this key
   */
  readonly type: KeyType

  /**
   * The public key that corresponds to this private key
   */
  readonly publicKey: PublicKeyType

  /**
   * The raw public key bytes (for Ed25519 and secp256k1 keys) or PKIX in ASN1
   * DER format (for RSA keys)
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

export interface RSAPrivateKey extends PrivateKeyBase<'RSA', RSAPublicKey> {}
export interface Ed25519PrivateKey extends PrivateKeyBase<'Ed25519', Ed25519PublicKey> {}
export interface Secp256k1PrivateKey extends PrivateKeyBase<'secp256k1', Secp256k1PublicKey> {}
export type PrivateKey = RSAPrivateKey | Ed25519PrivateKey | Secp256k1PrivateKey
