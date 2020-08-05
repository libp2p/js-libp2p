/// <reference types="node" />

/**
 * Supported key types.
 */
export type KeyType = "Ed25519" | "RSA" | "secp256k1";

/**
 * Maps an IPFS hash name to its node-forge equivalent.
 * See https://github.com/multiformats/multihash/blob/master/hashtable.csv
 */
export type HashType = "SHA1" | "SHA256" | "SHA512";

/**
 * Supported curve types.
 */
export type CurveType = "P-256" | "P-384" | "P-521";

/**
 * Supported cipher types.
 */
export type CipherType = "AES-128" | "AES-256" | "Blowfish";

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
    encrypt(data: Buffer): Promise<Buffer>;
    decrypt(data: Buffer): Promise<Buffer>;
  }
  /**
   * Create a new AES Cipher.
   * @param key The key, if length 16 then AES 128 is used. For length 32, AES 256 is used.
   * @param iv Must have length 16.
   */
  function create(key: Buffer, iv: Buffer): Promise<Cipher>;
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
    digest(data: Buffer): Promise<Buffer>;
    length: 20 | 32 | 64 | number;
  }
  /**
   * Create a new HMAC Digest.
   */
  function create(
    hash: "SHA1" | "SHA256" | "SHA512" | string,
    secret: Buffer
  ): Promise<Digest>;
}

/**
 * Generic public key interface.
 */
export interface PublicKey {
  readonly bytes: Buffer;
  verify(data: Buffer, sig: Buffer): Promise<boolean>;
  marshal(): Buffer;
  equals(key: PublicKey): boolean;
  hash(): Promise<Buffer>;
}

/**
 * Generic private key interface.
 */
export interface PrivateKey {
  readonly public: PublicKey;
  readonly bytes: Buffer;
  sign(data: Buffer): Promise<Buffer>;
  marshal(): Buffer;
  equals(key: PrivateKey): boolean;
  hash(): Promise<Buffer>;
  /**
   * Gets the ID of the key.
   *
   * The key id is the base58 encoding of the SHA-256 multihash of its public key.
   * The public key is a protobuf encoding containing a type and the DER encoding
   * of the PKCS SubjectPublicKeyInfo.
   */
  id(): Promise<string>;
  /**
   * Exports the password protected key in the format specified.
   */
  export(password: string, format?: "pkcs-8" | string): Promise<string>;
}

export interface Keystretcher {
  (res: Buffer): Keystretcher;
  iv: Buffer;
  cipherKey: Buffer;
  macKey: Buffer;
}

export interface StretchPair {
  k1: Keystretcher;
  k2: Keystretcher;
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
  export {};
  export namespace supportedKeys {
    namespace rsa {
      class RsaPublicKey implements PublicKey {
        constructor(key: Buffer);
        readonly bytes: Buffer;
        verify(data: Buffer, sig: Buffer): Promise<boolean>;
        marshal(): Buffer;
        encrypt(bytes: Buffer): Buffer;
        equals(key: PublicKey): boolean;
        hash(): Promise<Buffer>;
      }

      class RsaPrivateKey implements PrivateKey {
        constructor(key: any, publicKey: Buffer);
        readonly public: RsaPublicKey;
        readonly bytes: Buffer;
        genSecret(): Buffer;
        sign(data: Buffer): Promise<Buffer>;
        decrypt(bytes: Buffer): Buffer;
        marshal(): Buffer;
        equals(key: PrivateKey): boolean;
        hash(): Promise<Buffer>;
        id(): Promise<string>;
        export(password: string, format?: string): Promise<string>;
      }
      function unmarshalRsaPublicKey(buf: Buffer): RsaPublicKey;
      function unmarshalRsaPrivateKey(buf: Buffer): Promise<RsaPrivateKey>;
      function generateKeyPair(bits: number): Promise<RsaPrivateKey>;
      function fromJwk(jwk: Buffer): Promise<RsaPrivateKey>;
    }

    namespace ed25519 {
      class Ed25519PublicKey implements PublicKey {
        constructor(key: Buffer);
        readonly bytes: Buffer;
        verify(data: Buffer, sig: Buffer): Promise<boolean>;
        marshal(): Buffer;
        encrypt(bytes: Buffer): Buffer;
        equals(key: PublicKey): boolean;
        hash(): Promise<Buffer>;
      }

      class Ed25519PrivateKey implements PrivateKey {
        constructor(key: Buffer, publicKey: Buffer);
        readonly public: Ed25519PublicKey;
        readonly bytes: Buffer;
        sign(data: Buffer): Promise<Buffer>;
        marshal(): Buffer;
        equals(key: PrivateKey): boolean;
        hash(): Promise<Buffer>;
        id(): Promise<string>;
        export(password: string, format?: string): Promise<string>;
      }

      function unmarshalEd25519PrivateKey(
        buf: Buffer
      ): Promise<Ed25519PrivateKey>;
      function unmarshalEd25519PublicKey(buf: Buffer): Ed25519PublicKey;
      function generateKeyPair(): Promise<Ed25519PrivateKey>;
      function generateKeyPairFromSeed(
        seed: Buffer
      ): Promise<Ed25519PrivateKey>;
    }

    namespace secp256k1 {
      class Secp256k1PublicKey implements PublicKey {
        constructor(key: Buffer);
        readonly bytes: Buffer;
        verify(data: Buffer, sig: Buffer): Promise<boolean>;
        marshal(): Buffer;
        encrypt(bytes: Buffer): Buffer;
        equals(key: PublicKey): boolean;
        hash(): Promise<Buffer>;
      }

      class Secp256k1PrivateKey implements PrivateKey {
        constructor(key: Uint8Array | Buffer, publicKey: Uint8Array | Buffer);
        readonly public: Secp256k1PublicKey;
        readonly bytes: Buffer;
        sign(data: Buffer): Promise<Buffer>;
        marshal(): Buffer;
        equals(key: PrivateKey): boolean;
        hash(): Promise<Buffer>;
        id(): Promise<string>;
        export(password: string, format?: string): Promise<string>;
      }

      function unmarshalSecp256k1PrivateKey(
        bytes: Buffer
      ): Promise<Secp256k1PrivateKey>;
      function unmarshalSecp256k1PublicKey(bytes: Buffer): Secp256k1PublicKey;
      function generateKeyPair(): Promise<Secp256k1PrivateKey>;
    }
  }

  export const keysPBM: any;

  /**
   * Generates a keypair of the given type and bitsize.
   * @param type One of the supported key types.
   * @param bits Number of bits. Minimum of 1024.
   */
  export function generateKeyPair(
    type: KeyType | string,
    bits: number
  ): Promise<PrivateKey>;
  export function generateKeyPair(
    type: "Ed25519"
  ): Promise<keys.supportedKeys.ed25519.Ed25519PrivateKey>;
  export function generateKeyPair(
    type: "RSA",
    bits: number
  ): Promise<keys.supportedKeys.rsa.RsaPrivateKey>;
  export function generateKeyPair(
    type: "secp256k1"
  ): Promise<keys.supportedKeys.secp256k1.Secp256k1PrivateKey>;

  /**
   * Generates a keypair of the given type and bitsize.
   * @param type One of the supported key types. Currently only 'Ed25519' is supported.
   * @param seed A 32 byte uint8array.
   * @param bits Number of bits. Minimum of 1024.
   */
  export function generateKeyPairFromSeed(
    type: KeyType | string,
    seed: Uint8Array,
    bits: number
  ): Promise<PrivateKey>;
  export function generateKeyPairFromSeed(
    type: "Ed25519",
    seed: Uint8Array,
    bits: number
  ): Promise<keys.supportedKeys.ed25519.Ed25519PrivateKey>;

  /**
   * Generates an ephemeral public key and returns a function that will compute the shared secret key.
   * Focuses only on ECDH now, but can be made more general in the future.
   * @param curve The curve to use. One of 'P-256', 'P-384', 'P-521' is currently supported.
   */
  export function generateEphemeralKeyPair(
    curve: CurveType | string
  ): Promise<{
    key: Buffer;
    genSharedKey: (theirPub: Buffer, forcePrivate?: any) => Promise<Buffer>;
  }>;

  /**
   * Generates a set of keys for each party by stretching the shared key.
   * @param cipherType The cipher type to use. One of 'AES-128',  'AES-256', or 'Blowfish'
   * @param hashType The hash type to use. One of 'SHA1',  'SHA2256', or 'SHA2512'.
   * @param secret The shared key secret.
   */
  export function keyStretcher(
    cipherType: CipherType | string,
    hashType: HashType | string,
    secret: Buffer | string
  ): Promise<StretchPair>;

  /**
   * Converts a protobuf serialized public key into its representative object.
   * @param buf The protobuf serialized public key.
   */
  export function unmarshalPublicKey(buf: Buffer): PublicKey;

  /**
   * Converts a public key object into a protobuf serialized public key.
   * @param key An RSA, Ed25519, or Secp256k1 public key object.
   * @param type One of the supported key types.
   */
  export function marshalPublicKey(key: PublicKey, type?: KeyType | string): Buffer;

  /**
   * Converts a protobuf serialized private key into its representative object.
   * @param buf The protobuf serialized private key.
   */
  export function unmarshalPrivateKey(buf: Buffer): Promise<PrivateKey>;

  /**
   * Converts a private key object into a protobuf serialized private key.
   * @param key An RSA, Ed25519, or Secp256k1 private key object.
   * @param type One of the supported key types.
   */
  export function marshalPrivateKey(key: PrivateKey, type?: KeyType | string): Buffer;

  /**
   * Converts a PEM password protected private key into its representative object.
   * @param pem Password protected private key in PEM format.
   * @param password The password used to protect the key.
   */
  function _import(pem: string, password: string, format?: string): Promise<supportedKeys.rsa.RsaPrivateKey>;
  export { _import as import };
}

/**
 * Generates a Buffer populated by random bytes.
 * @param The size of the random bytes Buffer.
 */
export function randomBytes(number: number): Buffer;

/**
 * Computes the Password-Based Key Derivation Function 2.
 * @param password The password.
 * @param salt The salt.
 * @param iterations Number of iterations to use.
 * @param keySize The size of the output key in bytes.
 * @param hash The hash name ('sha1', 'sha2-512, ...)
 */
export function pbkdf2(
  password: string | Buffer,
  salt: string | Buffer,
  iterations: number,
  keySize: number,
  hash: string
): Buffer;
