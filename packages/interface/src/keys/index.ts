import type { Uint8ArrayList } from 'uint8arraylist'

export interface PublicKey {
  readonly bytes: Uint8Array
  verify(data: Uint8Array | Uint8ArrayList, sig: Uint8Array): boolean | Promise<boolean>
  marshal(): Uint8Array
  equals(key: PublicKey): boolean
  hash(): Uint8Array | Promise<Uint8Array>
}

/**
 * Generic private key interface
 */
export interface PrivateKey {
  readonly public: PublicKey
  readonly bytes: Uint8Array
  sign(data: Uint8Array | Uint8ArrayList): Uint8Array | Promise<Uint8Array>
  marshal(): Uint8Array
  equals(key: PrivateKey): boolean
  hash(): Uint8Array | Promise<Uint8Array>
  /**
   * Gets the ID of the key.
   *
   * The key id is the base58 encoding of the SHA-256 multihash of its public key.
   * The public key is a protobuf encoding containing a type and the DER encoding
   * of the PKCS SubjectPublicKeyInfo.
   */
  id(): Promise<string>
  /**
   * Exports the password protected key in the format specified.
   */
  export(password: string, format?: 'pkcs-8' | string): Promise<string>
}

export const Ed25519 = 'Ed25519'
export const RSA = 'RSA'
export const secp256k1 = 'secp256k1'

export type KeyType = typeof Ed25519 | typeof RSA | typeof secp256k1
