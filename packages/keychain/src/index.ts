/**
 * @packageDocumentation
 *
 * - Manages the lifecycle of a key
 * - Keys are encrypted at rest
 * - Enforces the use of safe key names
 * - Uses encrypted PKCS 8 for key storage
 * - Uses PBKDF2 for a "stetched" key encryption key
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
 * A private key is stored as an encrypted PKCS 8 structure in the PEM format. It is protected by a key generated from the key chain's *passPhrase* using **PBKDF2**.
 *
 * The default options for generating the derived encryption key are in the `dek` object.  This, along with the passPhrase, is the input to a `PBKDF2` function.
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
 * ![key storage](./doc/private-key.png?raw=true)
 *
 * ## Physical storage
 *
 * The actual physical storage of an encrypted key is left to implementations of [interface-datastore](https://github.com/ipfs/interface-datastore/).
 *
 * A key benefit is that now the key chain can be used in browser with the [js-datastore-level](https://github.com/ipfs/js-datastore-level) implementation.
 */

import { DefaultKeychain } from './keychain.js'
import type { ComponentLogger, KeyType, PeerId } from '@libp2p/interface'
import type { Datastore } from 'interface-datastore'
import type { Multibase } from 'multiformats/bases/interface.js'

export interface DEKConfig {
  hash: string
  salt: string
  iterationCount: number
  keyLength: number
}

export interface KeychainInit {
  pass?: string
  dek?: DEKConfig
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
   * Export an existing key as a PEM encrypted PKCS #8 string.
   *
   * @example
   *
   * ```TypeScript
   * await libp2p.keychain.createKey('keyTest', 'RSA', 4096)
   * const pemKey = await libp2p.keychain.exportKey('keyTest', 'password123')
   * ```
   */
  exportKey(name: string, password: string): Promise<Multibase<'m'>>

  /**
   * Import a new key from a PEM encoded PKCS #8 string.
   *
   * @example
   *
   * ```TypeScript
   * await libp2p.keychain.createKey('keyTest', 'RSA', 4096)
   * const pemKey = await libp2p.keychain.exportKey('keyTest', 'password123')
   * const keyInfo = await libp2p.keychain.importKey('keyTestImport', pemKey, 'password123')
   * ```
   */
  importKey(name: string, pem: string, password: string): Promise<KeyInfo>

  /**
   * Import a new key from a PeerId with a private key component
   *
   * @example
   *
   * ```TypeScript
   * const keyInfo = await libp2p.keychain.importPeer('keyTestImport', peerIdFromString('12D3Foo...'))
   * ```
   */
  importPeer(name: string, peerId: PeerId): Promise<KeyInfo>

  /**
   * Export an existing key as a PeerId
   *
   * @example
   *
   * ```TypeScript
   * const peerId = await libp2p.keychain.exportPeerId('key-name')
   * ```
   */
  exportPeerId(name: string): Promise<PeerId>

  /**
   * Create a key in the keychain.
   *
   * @example
   *
   * ```TypeScript
   * const keyInfo = await libp2p.keychain.createKey('keyTest', 'RSA', 4096)
   * ```
   */
  createKey(name: string, type: KeyType, size?: number): Promise<KeyInfo>

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
   * Removes a key from the keychain.
   *
   * @example
   *
   * ```TypeScript
   * await libp2p.keychain.createKey('keyTest', 'RSA', 4096)
   * const keyInfo = await libp2p.keychain.removeKey('keyTest')
   * ```
   */
  removeKey(name: string): Promise<KeyInfo>

  /**
   * Rename a key in the keychain.
   *
   * @example
   *
   * ```TypeScript
   * await libp2p.keychain.createKey('keyTest', 'RSA', 4096)
   * const keyInfo = await libp2p.keychain.renameKey('keyTest', 'keyNewNtest')
   * ```
   */
  renameKey(oldName: string, newName: string): Promise<KeyInfo>

  /**
   * Find a key by it's id.
   *
   * @example
   *
   * ```TypeScript
   * const keyInfo = await libp2p.keychain.createKey('keyTest', 'RSA', 4096)
   * const keyInfo2 = await libp2p.keychain.findKeyById(keyInfo.id)
   * ```
   */
  findKeyById(id: string): Promise<KeyInfo>

  /**
   * Find a key by it's name.
   *
   * @example
   *
   * ```TypeScript
   * const keyInfo = await libp2p.keychain.createKey('keyTest', 'RSA', 4096)
   * const keyInfo2 = await libp2p.keychain.findKeyByName('keyTest')
   * ```
   */
  findKeyByName(name: string): Promise<KeyInfo>

  /**
   * Rotate keychain password and re-encrypt all associated keys
   *
   * @example
   *
   * ```TypeScript
   * await libp2p.keychain.rotateKeychainPass('oldPassword', 'newPassword')
   * ```
   */
  rotateKeychainPass(oldPass: string, newPass: string): Promise<void>
}

export function keychain (init: KeychainInit = {}): (components: KeychainComponents) => Keychain {
  return (components: KeychainComponents) => {
    return new DefaultKeychain(components, init)
  }
}
