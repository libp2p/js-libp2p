/**
 * @packageDocumentation
 *
 * - Manages the life cycle of a key
 * - Keys are encrypted at rest
 * - Enforces the use of safe key names
 * - Uses encrypted PKCS 8 for key storage
 * - Uses PBKDF2 for a "stretched" key encryption key
 * - Enforces NIST SP 800-131A and NIST SP 800-132
 * - Delays reporting errors to slow down brute force attacks
 *
 * ## KeyInfo
 *
 * The key management and naming service API all return a `KeyInfo` object.  The `id` is a universally unique identifier for the key.  The `name` is local to the key chain.
 *
 * ```JSON
 * {
 *   "name": "rsa-key",
 *   "id": "QmYWYSUZ4PV6MRFYpdtEDJBiGs4UrmE6g8wmAWSePekXVW"
 * }
 * ```
 *
 * The **key id** is the SHA-256 [multihash](https://github.com/multiformats/multihash) of its public key.
 *
 * The *public key* is a [protobuf encoding](https://github.com/libp2p/js-libp2p/blob/main/packages/crypto/src/keys/keys.proto.js) containing a type and the [DER encoding](https://en.wikipedia.org/wiki/X.690) of the PKCS [SubjectPublicKeyInfo](https://www.ietf.org/rfc/rfc3279.txt).
 *
 * ## Private key storage
 *
 * A private key is stored as an encrypted PKCS 8 structure in the PEM format. It is protected by a key generated from the key chain's *pass phrase* using **PBKDF2**.
 *
 * The default options for generating the derived encryption key are in the `dek` object.  This, along with the pass phrase, is the input to a `PBKDF2` function.
 *
 * ```TypeScript
 * const defaultOptions = {
 *   // See https://cryptosense.com/parameter-choice-for-pbkdf2/
 *   dek: {
 *     keyLength: 512 / 8,
 *     iterationCount: 1000,
 *     salt: 'at least 16 characters long',
 *     hash: 'sha2-512'
 *   }
 * }
 * ```
 *
 * ![key storage](https://github.com/libp2p/js-libp2p/blob/main/doc/private-key.png?raw=true)
 *
 * ## Physical storage
 *
 * The actual physical storage of an encrypted key is left to implementations of [interface-datastore](https://github.com/ipfs/interface-datastore/).
 *
 * A key benefit is that now the key chain can be used in browser with the [js-datastore-level](https://github.com/ipfs/js-datastore-level) implementation.
 */

import { Keychain as KeychainClass } from './keychain.js'
import type { ComponentLogger, PrivateKey } from '@libp2p/interface'
import type { Datastore } from 'interface-datastore'

export interface DEKConfig {
  hash: string
  salt: string
  iterationCount: number
  keyLength: number
}

export interface KeychainInit {
  /**
   * The password is used to derive a key which encrypts the keychain at rest
   */
  pass?: string

  /**
   * This key configures how the keychain encryption key is derived from the
   * configured password
   */
  dek?: DEKConfig

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
  logger: ComponentLogger
}

export interface KeyInfo {
  /**
   * The universally unique key id
   */
  id: string

  /**
   * The local key name
   */
  name: string
}

export interface Keychain {
  /**
   * Find a key by name
   *
   * @example
   *
   * ```TypeScript
   * import { generateKeyPair } from '@libp2p/crypto/keys'
   *
   * const key = await generateKeyPair('Ed25519')
   * const keyInfo = await libp2p.keychain.importKey('my-key', key)
   * const keyInfo2 = await libp2p.keychain.findKeyByName(keyInfo.name)
   * ```
   */
  findKeyByName(name: string): Promise<KeyInfo>

  /**
   * Find a key by id
   *
   * @example
   *
   * ```TypeScript
   * import { generateKeyPair } from '@libp2p/crypto/keys'
   *
   * const key = await generateKeyPair('Ed25519')
   * const keyInfo = await libp2p.keychain.importKey('my-key', key)
   * const keyInfo2 = await libp2p.keychain.findKeyById(keyInfo.id)
   * ```
   */
  findKeyById (id: string): Promise<KeyInfo>

  /**
   * Import a new private key.
   *
   * @example
   *
   * ```TypeScript
   * import { generateKeyPair } from '@libp2p/crypto/keys'
   *
   * const key = await generateKeyPair('Ed25519')
   * const keyInfo = await libp2p.keychain.importKey('my-key', key)
   * ```
   */
  importKey(name: string, key: PrivateKey): Promise<KeyInfo>

  /**
   * Export an existing private key.
   *
   * @example
   *
   * ```TypeScript
   * import { generateKeyPair } from '@libp2p/crypto/keys'
   *
   * const key = await generateKeyPair('Ed25519')
   * const keyInfo = await libp2p.keychain.importKey('my-key', key)
   * const key = await libp2p.keychain.exportKey(keyInfo.id)
   * ```
   */
  exportKey(name: string): Promise<PrivateKey>

  /**
   * Removes a key from the keychain.
   *
   * @example
   *
   * ```TypeScript
   * await libp2p.services.keychain.createKey('keyTest', 'RSA', 4096)
   * const keyInfo = await libp2p.services.keychain.removeKey('keyTest')
   * ```
   */
  removeKey(name: string): Promise<KeyInfo>

  /**
   * Rename a key in the keychain. This is done in a batch commit with rollback
   * so errors thrown during the operation will not cause key loss.
   *
   * @example
   *
   * ```TypeScript
   * await libp2p.services.keychain.createKey('keyTest', 'RSA', 4096)
   * const keyInfo = await libp2p.services.keychain.renameKey('keyTest', 'keyNewTest')
   * ```
   */
  renameKey(oldName: string, newName: string): Promise<KeyInfo>

  /**
   * List all the keys.
   *
   * @example
   *
   * ```TypeScript
   * const keyInfos = await libp2p.keychain.listKeys()
   * ```
   */
  listKeys(): Promise<KeyInfo[]>

  /**
   * Rotate keychain password and re-encrypt all associated keys
   *
   * @example
   *
   * ```TypeScript
   * await libp2p.services.keychain.rotateKeychainPass('oldPassword', 'newPassword')
   * ```
   */
  rotateKeychainPass(oldPass: string, newPass: string): Promise<void>
}

export function keychain (init: KeychainInit = {}): (components: KeychainComponents) => Keychain {
  return (components: KeychainComponents) => {
    return new KeychainClass(components, init)
  }
}
