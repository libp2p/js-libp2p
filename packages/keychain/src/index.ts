/**
 * @packageDocumentation
 *
 * A WebCrypto-first keychain implementation for use with Helia and libp2p.
 *
 * ## Configuring additional implementations
 *
 * ECDSA, Ed25519 and RSA keys are supported out of the box but other schemes
 * are configurable by passing a `CryptoLoader` that can return `Crypto`
 * instances.
 *
 * ## Upgrading from 6.x
 *
 * - The `pass` option is now `password`
 * - `dek.salt` and `dek.iterationCount` are now `salt` and `iterations`
 * - A customized `dek.keyLength` or `dek.hash` goes in `legacyDek: { keyLength, hash }` (defaults are `64` and `'sha2-512'`). It is only used to read keys written by 6.x
 * - A `getCrypto` component is required. libp2p passes `libp2p.getCrypto`, for standalone use pass `defaultCryptoLoader()` or `createCryptoLoader([...])` from `@libp2p/crypto`
 * - Stores written by 6.x are migrated the first time the keychain is used. The migration is resumable and `/keychain/meta` is written last. Once migrated a store cannot be opened by 6.x
 * - `findKeyById` and `findKeyByName` have been removed
 * - `listKeys()` is an async generator
 * - `importKey` returns the imported key and `removeKey` returns nothing
 * - `rotateKeychainPass(password)` takes only the new password and changes the password at runtime
 */
import { Keychain as KeychainClass } from './keychain.ts'
import type { LegacyDek } from './legacy.ts'
import type { Crypto, PrivateKey, PublicKey } from '@libp2p/crypto'
import type { AbortOptions } from 'abort-error'
import type { Datastore } from 'interface-datastore'

export interface CryptoLoader {
  (codeOrName: number | string, options?: AbortOptions): Crypto | Promise<Crypto>
}

export interface KeyInfo {
  /**
   * The hash of the key
   */
  id: string

  /**
   * The key name
   */
  name: string
}

export interface GenerateKeyOptions extends AbortOptions, Record<string, any> {
  /**
   * The type of key to generate
   *
   * @default 'Ed25519'
   */
  type?: 'ECDSA' | 'Ed25519' | 'RSA' | string
}

export interface KeychainInit {
  /**
   * The password is used to derive a key which encrypts the keychain at rest
   */
  password?: string

  /**
   * Specify a non-default PBKDF2 salt
   */
  salt?: string | Uint8Array

  /**
   * How many iterations to use when deriving a key from the password
   *
   * @default 10_000
   */
  iterations?: number

  /**
   * The hash type
   *
   * @default SHA2-512
   */
  hash?: 'SHA-256' | 'SHA-384' | 'SHA-512'

  /**
   * Only needed if keys were stored by a previous version that was configured
   * with a non-default `dek.keyLength` or `dek.hash`, so they can be migrated
   *
   * @default { keyLength: 64, hash: 'sha2-512' }
   */
  legacyDek?: LegacyDek

  /**
   * The 'self' key is the private key of the node from which the peer id is
   * derived.
   *
   * It cannot be renamed or removed.
   *
   * By default it is stored under the 'self' key, to use a different name, pass
   * this option.
   *
   * @default 'self'
   */
  selfKey?: string
}

export interface KeychainComponents {
  datastore: Datastore
  getCrypto: CryptoLoader
}

export interface Keychain {
  /**
   * Create a key of the passed type and store it under the specified name. A
   * cryptography implementation must be configured for the key type (defaults
   * to Ed25519).
   */
  generateKey (name: string, options?: AbortOptions & Record<string, any>): Promise<PrivateKey>

  /**
   * Import a new private key.
   *
   * The `type` parameter must match a supported cryptography implementation.
   *
   * The default supported key types are `Ed25519` and `RSA`, others may be
   * added through configuration.
   *
   * @example
   *
   * ```TypeScript
   * const key = await crypto.subtle.generateKey('Ed25519', true, ['sign', 'verify'])
   * const raw = await crypto.subtle.exportKey('raw', key)
   * await helia.keychain.importKey('my-key', 'Ed25519', raw)
   * ```
   */
  importKey(name: string, key: PrivateKey, options?: AbortOptions): Promise<PrivateKey>

  /**
   * Export an existing private key.
   *
   * @example
   *
   * ```TypeScript
   * const raw = await helia.exportKey('my-key')
   * const key = await crypto.subtle.importKey('raw', raw, {
   *   name: 'Ed25519'
   * }, true, ['sign', 'verify'])
   * ```
   */
  exportKey(name: string, options?: AbortOptions): Promise<PrivateKey>

  /**
   * Removes a key from the keychain.
   *
   * @example
   *
   * ```TypeScript
   * await helia.keychain.removeKey('keyTest')
   * ```
   */
  removeKey(name: string, options?: AbortOptions): Promise<void>

  /**
   * Rename a key in the keychain. This is done in a batch commit with rollback
   * so errors thrown during the operation will not cause key loss.
   *
   * @example
   *
   * ```TypeScript
   * await helia.keychain.renameKey('oldName', 'newName')
   * ```
   */
  renameKey(oldName: string, newName: string, options?: AbortOptions): Promise<void>

  /**
   * List all the keys.
   *
   * @example
   *
   * ```TypeScript
   * for await (const name of helia.keychain.listKeys()) {
   *   // ...
   * }
   * ```
   */
  listKeys(options?: AbortOptions): AsyncGenerator<KeyInfo>

  /**
   * Re-encrypt all keys in the keychain using a crypto graphic key derived
   * from the password
   *
   * @example
   *
   * ```TypeScript
   * await helia.keychain.rotateKeychainPass('newPassword')
   * ```
   */
  rotateKeychainPass(password: string, options?: AbortOptions): Promise<void>

  /**
   * Attempts to load a public key from a serialized protobuf message conforming
   * to the `PublicKey` message.
   */
  loadPublicKeyFromProtobuf (buf: Uint8Array, options?: AbortOptions): Promise<PublicKey>
}

export type { LegacyDek }

export function keychain (init?: KeychainInit): (components: KeychainComponents) => Keychain {
  return (components) => new KeychainClass(components, init)
}

export function isKeychain (obj?: any): obj is Keychain {
  if (obj == null) {
    return false
  }

  return typeof obj.generateKey === 'function' &&
    typeof obj.importKey === 'function' &&
    typeof obj.exportKey === 'function' &&
    typeof obj.removeKey === 'function' &&
    typeof obj.renameKey === 'function' &&
    typeof obj.listKeys === 'function' &&
    typeof obj.rotateKeychainPass === 'function'
}
