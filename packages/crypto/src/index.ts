/**
 * @packageDocumentation
 *
 * WebCrypto-based implementations of ECDSA, Ed25519, and RSA cryptography.
 */
import type { AbortOptions } from 'abort-error'
import type { CID, MultihashDigest } from 'multiformats/cid'

export { ecdsaCrypto } from './ecdsa.ts'
export { ed25519Crypto } from './ed25519.ts'
export { rsaCrypto } from './rsa.ts'

export interface PublicKey {
  /**
   * The type of the crypto implementation, e.g. `Ed15519`
   */
  readonly type: string

  /**
   * The code that is used as the `Type` field in the protobuf representation of
   * the public/private keys
   */
  readonly code: number

  /**
   * Return a MultihashDigest that represents this key
   */
  toMultihash (): MultihashDigest

  /**
   * Return the libp2p-key CID that represents this key
   */
  toCID (): CID<unknown, 0x72, number, 1>

  /**
   * Return this key encoded as a protobuf PublicKey message
   */
  toProtobuf (): Uint8Array<ArrayBuffer>

  /**
   * Return this key as a RFC 7517 Json Web Key
   */
  toJWK (): JsonWebKey

  /**
   * Verify the passed message against it's signature
   */
  verify(message: Uint8Array, signature: Uint8Array, options?: AbortOptions): boolean | Promise<boolean>
}

export function isPublicKey (obj?: any): obj is PublicKey {
  if (obj == null) {
    return false
  }

  return typeof obj.type === 'string' && typeof obj.code === 'number' && typeof obj.verify === 'function'
}

export interface PrivateKey {
  /**
   * The type of the crypto implementation, e.g. `Ed15519`
   */
  readonly type: string

  /**
   * The code that is used as the `Type` field in the protobuf representation of
   * the public/private keys
   */
  readonly code: number

  /**
   * The public key that corresponds to this private key
   */
  readonly publicKey: PublicKey

  /**
   * Return this key encoded as a protobuf PrivateKey message
   */
  toProtobuf (): Uint8Array<ArrayBuffer>

  /**
   * Return this key as a RFC 7517 Json Web Key
   */
  toJWK (): JsonWebKey

  /**
   * Sign the passed message and return a signature
   */
  sign(message: Uint8Array, options?: AbortOptions): Uint8Array<ArrayBuffer> | Promise<Uint8Array<ArrayBuffer>>
}

export function isPrivateKey (obj?: any): obj is PrivateKey {
  if (obj == null) {
    return false
  }

  return typeof obj.type === 'string' && typeof obj.code === 'number' && typeof obj.sign === 'function' && isPublicKey(obj.publicKey)
}

export interface Crypto {
  /**
   * The type of the crypto implementation, e.g. `Ed15519`
   */
  type: string

  /**
   * The code that is used as the `Type` field in the protobuf representation of
   * the public/private keys
   */
  code: number

  /**
   * Create a new private key
   */
  generatePrivateKey(options?: AbortOptions & Record<string, any>): Promise<PrivateKey>

  /**
   * Convert the passed bytes into a public key. The bytes come from the `.Data`
   * field of a `PublicKey` protobuf message.
   */
  publicKeyFromProtobuf(buf: Uint8Array, options?: AbortOptions): PublicKey | Promise<PublicKey>

  /**
   * Convert the passed bytes into a public key. The bytes come from the `.Data`
   * field of a `PublicKey` protobuf message.
   */
  privateKeyFromProtobuf(buf: Uint8Array, options?: AbortOptions): PrivateKey | Promise<PrivateKey>
}
