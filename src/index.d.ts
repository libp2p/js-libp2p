/**
 * Supported key types.
 */
export type KeyType = 'Ed25519' | 'RSA' | 'secp256k1'

/**
 * Maps an IPFS hash name to its node-forge equivalent.
 * See https://github.com/multiformats/multihash/blob/master/hashtable.csv
 */
export type HashType = 'SHA1' | 'SHA256' | 'SHA512'

/**
 * Supported curve types.
 */
export type CurveType = 'P-256' | 'P-384' | 'P-521'

/**
 * Supported cipher types.
 */
export type CipherType = 'AES-128' | 'AES-256' | 'Blowfish'

/**
 * Exposes an interface to AES encryption (formerly Rijndael),
 * as defined in U.S. Federal Information Processing Standards Publication 197.
 * This uses CTR mode.
 */
export namespace aes {
  /**
   * AES Cipher in CTR mode.
   */
  interface Cipher {
    encrypt(data: Uint8Array): Promise<Uint8Array>
    decrypt(data: Uint8Array): Promise<Uint8Array>
  }
  /**
   * Create a new AES Cipher.
   *
   * @param key - The key, if length 16 then AES 128 is used. For length 32, AES 256 is used.
   * @param iv - Must have length 16.
   */
  function create (key: Uint8Array, iv: Uint8Array): Promise<Cipher>
}

/**
 * Exposes an interface to the Keyed-Hash Message Authentication Code (HMAC)
 * as defined in U.S. Federal Information Processing Standards Publication 198.
 * An HMAC is a cryptographic hash that uses a key to sign a message.
 * The receiver verifies the hash by recomputing it using the same key.
 */
export namespace hmac {
  /**
   * HMAC Digest.
   */
  interface Digest {
    digest(data: Uint8Array): Promise<Uint8Array>
    length: 20 | 32 | 64 | number
  }
  /**
   * Create a new HMAC Digest.
   */
  function create (
    hash: 'SHA1' | 'SHA256' | 'SHA512' | string,
    secret: Uint8Array
  ): Promise<Digest>
}

/**
 * Generic public key interface.
 */
export interface PublicKey {
  readonly bytes: Uint8Array
  verify: (data: Uint8Array, sig: Uint8Array) => Promise<boolean>
  marshal: () => Uint8Array
  equals: (key: PublicKey) => boolean
  hash: () => Promise<Uint8Array>
}

/**
 * Generic private key interface.
 */
export interface PrivateKey {
  readonly public: PublicKey
  readonly bytes: Uint8Array
  sign: (data: Uint8Array) => Promise<Uint8Array>
  marshal: () => Uint8Array
  equals: (key: PrivateKey) => boolean
  hash: () => Promise<Uint8Array>
  /**
   * Gets the ID of the key.
   *
   * The key id is the base58 encoding of the SHA-256 multihash of its public key.
   * The public key is a protobuf encoding containing a type and the DER encoding
   * of the PKCS SubjectPublicKeyInfo.
   */
  id: () => Promise<string>
  /**
   * Exports the password protected key in the format specified.
   */
  export: (password: string, format?: 'pkcs-8' | string) => Promise<string>
}

export interface Keystretcher {
  (res: Uint8Array): Keystretcher
  iv: Uint8Array
  cipherKey: Uint8Array
  macKey: Uint8Array
}

export interface StretchPair {
  k1: Keystretcher
  k2: Keystretcher
}

/**
 * Exposes an interface to various cryptographic key generation routines.
 * Currently the 'RSA' and 'ed25519' types are supported, although ed25519 keys
 * support only signing and verification of messages. For encryption / decryption
 * support, RSA keys should be used.
 * Installing the libp2p-crypto-secp256k1 module adds support for the 'secp256k1'
 * type, which supports ECDSA signatures using the secp256k1 elliptic curve
 * popularized by Bitcoin. This module is not installed by default, and should be
 * explicitly depended on if your project requires secp256k1 support.
 */
export namespace keys {
  export {}
  export namespace supportedKeys {
    namespace rsa {
      class RsaPublicKey implements PublicKey {
        constructor (key: Uint8Array);
        readonly bytes: Uint8Array
        verify (data: Uint8Array, sig: Uint8Array): Promise<boolean>;
        marshal (): Uint8Array;
        encrypt (bytes: Uint8Array): Uint8Array;
        equals (key: PublicKey): boolean;
        hash (): Promise<Uint8Array>;
      }

      class RsaPrivateKey implements PrivateKey {
        constructor (key: any, publicKey: Uint8Array);
        readonly public: RsaPublicKey
        readonly bytes: Uint8Array
        genSecret (): Uint8Array;
        sign (data: Uint8Array): Promise<Uint8Array>;
        decrypt (bytes: Uint8Array): Uint8Array;
        marshal (): Uint8Array;
        equals (key: PrivateKey): boolean;
        hash (): Promise<Uint8Array>;
        id (): Promise<string>;
        export (password: string, format?: string): Promise<string>;
      }
      function unmarshalRsaPublicKey (buf: Uint8Array): RsaPublicKey
      function unmarshalRsaPrivateKey (buf: Uint8Array): Promise<RsaPrivateKey>
      function generateKeyPair (bits: number): Promise<RsaPrivateKey>
      function fromJwk (jwk: Uint8Array): Promise<RsaPrivateKey>
    }

    namespace ed25519 {
      class Ed25519PublicKey implements PublicKey {
        constructor (key: Uint8Array);
        readonly bytes: Uint8Array
        verify (data: Uint8Array, sig: Uint8Array): Promise<boolean>;
        marshal (): Uint8Array;
        encrypt (bytes: Uint8Array): Uint8Array;
        equals (key: PublicKey): boolean;
        hash (): Promise<Uint8Array>;
      }

      class Ed25519PrivateKey implements PrivateKey {
        constructor (key: Uint8Array, publicKey: Uint8Array);
        readonly public: Ed25519PublicKey
        readonly bytes: Uint8Array
        sign (data: Uint8Array): Promise<Uint8Array>;
        marshal (): Uint8Array;
        equals (key: PrivateKey): boolean;
        hash (): Promise<Uint8Array>;
        id (): Promise<string>;
        export (password: string, format?: string): Promise<string>;
      }

      function unmarshalEd25519PrivateKey (
        buf: Uint8Array
      ): Promise<Ed25519PrivateKey>
      function unmarshalEd25519PublicKey (buf: Uint8Array): Ed25519PublicKey
      function generateKeyPair (): Promise<Ed25519PrivateKey>
      function generateKeyPairFromSeed (
        seed: Uint8Array
      ): Promise<Ed25519PrivateKey>
    }

    namespace secp256k1 {
      class Secp256k1PublicKey implements PublicKey {
        constructor (key: Uint8Array);
        readonly bytes: Uint8Array
        verify (data: Uint8Array, sig: Uint8Array): Promise<boolean>;
        marshal (): Uint8Array;
        encrypt (bytes: Uint8Array): Uint8Array;
        equals (key: PublicKey): boolean;
        hash (): Promise<Uint8Array>;
      }

      class Secp256k1PrivateKey implements PrivateKey {
        constructor (key: Uint8Array, publicKey: Uint8Array);
        readonly public: Secp256k1PublicKey
        readonly bytes: Uint8Array
        sign (data: Uint8Array): Promise<Uint8Array>;
        marshal (): Uint8Array;
        equals (key: PrivateKey): boolean;
        hash (): Promise<Uint8Array>;
        id (): Promise<string>;
        export (password: string, format?: string): Promise<string>;
      }

      function unmarshalSecp256k1PrivateKey (
        bytes: Uint8Array
      ): Promise<Secp256k1PrivateKey>
      function unmarshalSecp256k1PublicKey (bytes: Uint8Array): Secp256k1PublicKey
      function generateKeyPair (): Promise<Secp256k1PrivateKey>
    }
  }

  export const keysPBM: any

  /**
   * Generates a keypair of the given type and bitsize.
   *
   * @param type - One of the supported key types.
   * @param bits - Number of bits. Minimum of 1024.
   */
  export function generateKeyPair (
    type: KeyType | string,
    bits: number
  ): Promise<PrivateKey>
  export function generateKeyPair (
    type: 'Ed25519'
  ): Promise<keys.supportedKeys.ed25519.Ed25519PrivateKey>
  export function generateKeyPair (
    type: 'RSA',
    bits: number
  ): Promise<keys.supportedKeys.rsa.RsaPrivateKey>
  export function generateKeyPair (
    type: 'secp256k1'
  ): Promise<keys.supportedKeys.secp256k1.Secp256k1PrivateKey>

  /**
   * Generates a keypair of the given type and bitsize.
   *
   * @param type - One of the supported key types. Currently only 'Ed25519' is supported.
   * @param seed - A 32 byte uint8array.
   * @param bits - Number of bits. Minimum of 1024.
   */
  export function generateKeyPairFromSeed (
    type: KeyType | string,
    seed: Uint8Array,
    bits: number
  ): Promise<PrivateKey>
  export function generateKeyPairFromSeed (
    type: 'Ed25519',
    seed: Uint8Array,
    bits: number
  ): Promise<keys.supportedKeys.ed25519.Ed25519PrivateKey>

  /**
   * Generates an ephemeral public key and returns a function that will compute the shared secret key.
   * Focuses only on ECDH now, but can be made more general in the future.
   *
   * @param curve - The curve to use. One of 'P-256', 'P-384', 'P-521' is currently supported.
   */
  export function generateEphemeralKeyPair (
    curve: CurveType | string
  ): Promise<{
    key: Uint8Array
    genSharedKey: (theirPub: Uint8Array, forcePrivate?: any) => Promise<Uint8Array>
  }>

  /**
   * Generates a set of keys for each party by stretching the shared key.
   *
   * @param cipherType - The cipher type to use. One of 'AES-128',  'AES-256', or 'Blowfish'
   * @param hashType - The hash type to use. One of 'SHA1',  'SHA2256', or 'SHA2512'.
   * @param secret - The shared key secret.
   */
  export function keyStretcher (
    cipherType: CipherType | string,
    hashType: HashType | string,
    secret: Uint8Array | string
  ): Promise<StretchPair>

  /**
   * Converts a protobuf serialized public key into its representative object.
   *
   * @param buf - The protobuf serialized public key.
   */
  export function unmarshalPublicKey (buf: Uint8Array): PublicKey

  /**
   * Converts a public key object into a protobuf serialized public key.
   *
   * @param key - An RSA, Ed25519, or Secp256k1 public key object.
   * @param type - One of the supported key types.
   */
  export function marshalPublicKey (key: PublicKey, type?: KeyType | string): Uint8Array

  /**
   * Converts a protobuf serialized private key into its representative object.
   *
   * @param buf - The protobuf serialized private key.
   */
  export function unmarshalPrivateKey (buf: Uint8Array): Promise<PrivateKey>

  /**
   * Converts a private key object into a protobuf serialized private key.
   *
   * @param key - An RSA, Ed25519, or Secp256k1 private key object.
   * @param type - One of the supported key types.
   */
  export function marshalPrivateKey (key: PrivateKey, type?: KeyType | string): Uint8Array

  /**
   * Converts a PEM password protected private key into its representative object.
   *
   * @param pem - Password protected private key in PEM format.
   * @param password - The password used to protect the key.
   */
  function _import (pem: string, password: string, format?: string): Promise<supportedKeys.rsa.RsaPrivateKey>
  export { _import as import }
}

/**
 * Generates a Uint8Array populated by random bytes.
 *
 * @param The - size of the random bytes Uint8Array.
 */
export function randomBytes (number: number): Uint8Array

/**
 * Computes the Password-Based Key Derivation Function 2.
 *
 * @param password - The password.
 * @param salt - The salt.
 * @param iterations - Number of iterations to use.
 * @param keySize - The size of the output key in bytes.
 * @param hash - The hash name ('sha1', 'sha2-512, ...)
 */
export function pbkdf2 (
  password: string | Uint8Array,
  salt: string | Uint8Array,
  iterations: number,
  keySize: number,
  hash: string
): Uint8Array
