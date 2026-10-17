/**
 * @packageDocumentation
 *
 * A WebCrypto-first keychain that stores private keys encrypted at rest.
 *
 * ## Example
 *
 * Configure the keychain as a libp2p service:
 *
 * ```TypeScript
 * import { keychain } from '@libp2p/keychain'
 * import { createLibp2p } from 'libp2p'
 *
 * const node = await createLibp2p({
 *   services: {
 *     keychain: keychain({
 *       password: 'a password of at least 20 characters'
 *     })
 *   }
 * })
 *
 * const key = await node.services.keychain.generateKey('my-key', { type: 'ECDSA' })
 *
 * for await (const { id, name } of node.services.keychain.listKeys()) {
 *   console.info(name, id)
 * }
 *
 * const exported = await node.services.keychain.exportKey('my-key')
 * const signature = await exported.sign(Uint8Array.from([0, 1, 2, 3]))
 * ```
 *
 * ## Standalone use
 *
 * Outside libp2p, pass a datastore and a `CryptoLoader`:
 *
 * ```TypeScript
 * import { defaultCryptoLoader, generateKeyPair } from '@libp2p/crypto'
 * import { keychain } from '@libp2p/keychain'
 * import { MemoryDatastore } from 'datastore-core'
 *
 * const kc = keychain({
 *   password: 'a password of at least 20 characters'
 * })({
 *   datastore: new MemoryDatastore(),
 *   getCrypto: defaultCryptoLoader()
 * })
 *
 * await kc.importKey('imported', await generateKeyPair('Ed25519'))
 * await kc.renameKey('imported', 'renamed')
 * await kc.rotateKeychainPass('a new password of at least 20 characters')
 * await kc.removeKey('renamed')
 * ```
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
import type { CryptoLoader, PrivateKey, PublicKey } from '@libp2p/crypto'
import type { AbortOptions } from 'abort-error'
import type { Datastore } from 'interface-datastore'

export { DecryptionFailedError, InvalidParametersError, KeychainMigrationError } from './errors.ts'
export type { CryptoLoader }

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
   * @default 'SHA-512'
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
  generateKey (name: string, options?: GenerateKeyOptions): Promise<PrivateKey>

  /**
   * Import a private key and store it under the specified name.
   *
   * The default supported key types are `ECDSA`, `Ed25519` and `RSA`, others
   * may be added by passing a `getCrypto` component that can load them.
   */
  importKey(name: string, key: PrivateKey, options?: AbortOptions): Promise<PrivateKey>

  /**
   * Export an existing private key.
   */
  exportKey(name: string, options?: AbortOptions): Promise<PrivateKey>

  /**
   * Removes a key from the keychain.
   */
  removeKey(name: string, options?: AbortOptions): Promise<void>

  /**
   * Rename a key in the keychain. This is done in a batch commit with rollback
   * so errors thrown during the operation will not cause key loss.
   */
  renameKey(oldName: string, newName: string, options?: AbortOptions): Promise<void>

  /**
   * List all the keys.
   */
  listKeys(options?: AbortOptions): AsyncGenerator<KeyInfo>

  /**
   * Re-encrypt all keys in the keychain using a cryptographic key derived
   * from the password
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
