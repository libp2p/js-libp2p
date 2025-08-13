import type { Nonce } from './nonce.js'
import type { NoiseExtensions, NoiseHandshakePayload } from './proto/payload.js'
import type { ConnectionEncrypter, Logger, PrivateKey, PublicKey } from '@libp2p/interface'
import type { LengthPrefixedStream } from '@libp2p/utils'
import type { Uint8ArrayList } from 'uint8arraylist'

/** Crypto functions defined by the noise protocol, abstracted from the underlying implementations */
export interface ICrypto {
  generateKeypair(): KeyPair
  dh(keypair: KeyPair, publicKey: Uint8Array | Uint8ArrayList): Uint8Array
  encrypt(plaintext: Uint8Array | Uint8ArrayList, nonce: Uint8Array, ad: Uint8Array, k: Uint8Array): Uint8ArrayList | Uint8Array
  decrypt(ciphertext: Uint8Array | Uint8ArrayList, nonce: Uint8Array, ad: Uint8Array, k: Uint8Array, dst?: Uint8Array): Uint8ArrayList | Uint8Array
  hash(data: Uint8Array | Uint8ArrayList): Uint8Array
  hkdf(ck: Uint8Array, ikm: Uint8Array): [Uint8Array, Uint8Array, Uint8Array]
}

export interface HandshakeParams {
  log: Logger
  connection: LengthPrefixedStream
  crypto: ICrypto
  privateKey: PrivateKey
  prologue: Uint8Array
  /** static keypair */
  s: KeyPair
  remoteIdentityKey?: PublicKey
  extensions?: NoiseExtensions
}

export interface HandshakeResult {
  payload: NoiseHandshakePayload
  encrypt (plaintext: Uint8Array | Uint8ArrayList): Uint8Array | Uint8ArrayList
  decrypt (ciphertext: Uint8Array | Uint8ArrayList, dst?: Uint8Array): Uint8Array | Uint8ArrayList
}

/**
 * A CipherState object contains k and n variables, which it uses to encrypt and decrypt ciphertexts.
 * During the handshake phase each party has a single CipherState, but during the transport phase each party has two CipherState objects: one for sending, and one for receiving.
 */
export interface ICipherState {
  /** A cipher key of 32 bytes (which may be empty). Empty is a special value which indicates k has not yet been initialized. */
  k?: Uint8Array
  /**
   * An 8-byte (64-bit) unsigned integer nonce.
   *
   * For performance reasons, the nonce is represented as a Nonce object
   * The nonce is treated as a uint64, even though the underlying `number` only has 52 safely-available bits.
   */
  n: Nonce
}

/**
 * A SymmetricState object contains a CipherState plus ck and h variables. It is so-named because it encapsulates all the "symmetric crypto" used by Noise.
 * During the handshake phase each party has a single SymmetricState, which can be deleted once the handshake is finished.
 */
export interface ISymmetricState {
  cs: ICipherState
  /** A chaining key of 32 bytes. */
  ck: Uint8Array
  /** A hash output of 32 bytes. */
  h: Uint8Array
}

/**
 * A HandshakeState object contains a SymmetricState plus DH variables (s, e, rs, re) and a variable representing the handshake pattern.
 * During the handshake phase each party has a single HandshakeState, which can be deleted once the handshake is finished.
 */
export interface IHandshakeState {
  ss: ISymmetricState
  /** The local static key pair */
  s?: KeyPair
  /** The local ephemeral key pair */
  e?: KeyPair
  /** The remote party's static public key */
  rs?: Uint8Array | Uint8ArrayList
  /** The remote party's ephemeral public key */
  re?: Uint8Array | Uint8ArrayList
}

export interface KeyPair {
  publicKey: Uint8Array
  privateKey: Uint8Array
}

export interface INoiseExtensions {
  webtransportCerthashes: Uint8Array[]
}

export interface INoiseConnection extends ConnectionEncrypter<INoiseExtensions> { }
