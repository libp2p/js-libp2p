/**
 * @packageDocumentation
 *
 * The libp2p keychain provides an API to store keys in a datastore in
 * an encrypted format.
 *
 * @example
 *
 * ```typescript
 * import { createLibp2p } from 'libp2p'
 * import { FsDatastore } from 'datastore-fs'
 *
 * const node = await createLibp2p({
 *   datastore: new FsDatastore('/path/to/dir')
 * })
 *
 * const info = await node.keychain.createKey('my-new-key', 'Ed25519')
 *
 * console.info(info) // { id: '...', name: 'my-new-key' }
 * ```
 */

import type { KeyType } from '../keys/index.js'
import type { PeerId } from '../peer-id/index.js'
import type { Multibase } from 'multiformats/bases/interface'

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

export interface KeyChain {
  /**
   * Export an existing key as a PEM encrypted PKCS #8 string.
   *
   * @example
   *
   * ```js
   * await libp2p.keychain.createKey('keyTest', 'RSA', 4096)
   * const pemKey = await libp2p.keychain.exportKey('keyTest', 'password123')
   * ```
   */
  exportKey: (name: string, password: string) => Promise<Multibase<'m'>>

  /**
   * Import a new key from a PEM encoded PKCS #8 string.
   *
   * @example
   *
   * ```js
   * await libp2p.keychain.createKey('keyTest', 'RSA', 4096)
   * const pemKey = await libp2p.keychain.exportKey('keyTest', 'password123')
   * const keyInfo = await libp2p.keychain.importKey('keyTestImport', pemKey, 'password123')
   * ```
   */
  importKey: (name: string, pem: string, password: string) => Promise<KeyInfo>

  /**
   * Import a new key from a PeerId with a private key component
   *
   * @example
   *
   * ```js
   * const keyInfo = await libp2p.keychain.importPeer('keyTestImport', peerIdFromString('12D3Foo...'))
   * ```
   */
  importPeer: (name: string, peerId: PeerId) => Promise<KeyInfo>

  /**
   * Export an existing key as a PeerId
   *
   * @example
   *
   * ```js
   * const peerId = await libp2p.keychain.exportPeerId('key-name')
   * ```
   */
  exportPeerId: (name: string) => Promise<PeerId>

  /**
   * Create a key in the keychain.
   *
   * @example
   *
   * ```js
   * const keyInfo = await libp2p.keychain.createKey('keyTest', 'RSA', 4096)
   * ```
   */
  createKey: (name: string, type: KeyType, size?: number) => Promise<KeyInfo>

  /**
   * List all the keys.
   *
   * @example
   *
   * ```js
   * const keyInfos = await libp2p.keychain.listKeys()
   * ```
   */
  listKeys: () => Promise<KeyInfo[]>

  /**
   * Removes a key from the keychain.
   *
   * @example
   *
   * ```js
   * await libp2p.keychain.createKey('keyTest', 'RSA', 4096)
   * const keyInfo = await libp2p.keychain.removeKey('keyTest')
   * ```
   */
  removeKey: (name: string) => Promise<KeyInfo>

  /**
   * Rename a key in the keychain.
   *
   * @example
   *
   * ```js
   * await libp2p.keychain.createKey('keyTest', 'RSA', 4096)
   * const keyInfo = await libp2p.keychain.renameKey('keyTest', 'keyNewNtest')
   * ```
   */
  renameKey: (oldName: string, newName: string) => Promise<KeyInfo>

  /**
   * Find a key by it's id.
   *
   * @example
   *
   * ```js
   * const keyInfo = await libp2p.keychain.createKey('keyTest', 'RSA', 4096)
   * const keyInfo2 = await libp2p.keychain.findKeyById(keyInfo.id)
   * ```
   */
  findKeyById: (id: string) => Promise<KeyInfo>

  /**
   * Find a key by it's name.
   *
   * @example
   *
   * ```js
   * const keyInfo = await libp2p.keychain.createKey('keyTest', 'RSA', 4096)
   * const keyInfo2 = await libp2p.keychain.findKeyByName('keyTest')
   * ```
   */
  findKeyByName: (name: string) => Promise<KeyInfo>

  /**
   * Rotate keychain password and re-encrypt all associated keys
   *
   * @example
   *
   * ```js
   * await libp2p.keychain.rotateKeychainPass('oldPassword', 'newPassword')
   * ```
   */
  rotateKeychainPass: (oldPass: string, newPass: string) => Promise<void>
}
