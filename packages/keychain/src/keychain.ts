/* eslint max-nested-callbacks: ["error", 5] */

import { pbkdf2, randomBytes } from '@libp2p/crypto'
import { generateKeyPair, importKey, unmarshalPrivateKey } from '@libp2p/crypto/keys'
import { InvalidParametersError, NotFoundError, serviceCapabilities } from '@libp2p/interface'
import { peerIdFromKeys } from '@libp2p/peer-id'
import { Key } from 'interface-datastore/key'
import mergeOptions from 'merge-options'
import sanitize from 'sanitize-filename'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import type { KeychainComponents, KeychainInit, Keychain, KeyInfo } from './index.js'
import type { Logger, KeyType, PeerId } from '@libp2p/interface'

const keyPrefix = '/pkcs8/'
const infoPrefix = '/info/'
const privates = new WeakMap<object, { dek: string }>()

// NIST SP 800-132
const NIST = {
  minKeyLength: 112 / 8,
  minSaltLength: 128 / 8,
  minIterationCount: 1000
}

const defaultOptions = {
  // See https://cryptosense.com/parametesr-choice-for-pbkdf2/
  dek: {
    keyLength: 512 / 8,
    iterationCount: 10000,
    salt: 'you should override this value with a crypto secure random number',
    hash: 'sha2-512'
  }
}

function validateKeyName (name: string): boolean {
  if (name == null) {
    return false
  }
  if (typeof name !== 'string') {
    return false
  }
  return name === sanitize(name.trim()) && name.length > 0
}

/**
 * Throws an error after a delay
 *
 * This assumes than an error indicates that the keychain is under attack. Delay returning an
 * error to make brute force attacks harder.
 */
async function randomDelay (): Promise<void> {
  const min = 200
  const max = 1000
  const delay = Math.random() * (max - min) + min

  await new Promise(resolve => setTimeout(resolve, delay))
}

/**
 * Converts a key name into a datastore name
 */
function DsName (name: string): Key {
  return new Key(keyPrefix + name)
}

/**
 * Converts a key name into a datastore info name
 */
function DsInfoName (name: string): Key {
  return new Key(infoPrefix + name)
}

/**
 * Manages the lifecycle of a key. Keys are encrypted at rest using PKCS #8.
 *
 * A key in the store has two entries
 * - '/info/*key-name*', contains the KeyInfo for the key
 * - '/pkcs8/*key-name*', contains the PKCS #8 for the key
 *
 */
export class DefaultKeychain implements Keychain {
  private readonly components: KeychainComponents
  private readonly init: KeychainInit
  private readonly log: Logger

  /**
   * Creates a new instance of a key chain
   */
  constructor (components: KeychainComponents, init: KeychainInit) {
    this.components = components
    this.log = components.logger.forComponent('libp2p:keychain')
    this.init = mergeOptions(defaultOptions, init)

    // Enforce NIST SP 800-132
    if (this.init.pass != null && this.init.pass?.length < 20) {
      throw new Error('pass must be least 20 characters')
    }
    if (this.init.dek?.keyLength != null && this.init.dek.keyLength < NIST.minKeyLength) {
      throw new Error(`dek.keyLength must be least ${NIST.minKeyLength} bytes`)
    }
    if (this.init.dek?.salt?.length != null && this.init.dek.salt.length < NIST.minSaltLength) {
      throw new Error(`dek.saltLength must be least ${NIST.minSaltLength} bytes`)
    }
    if (this.init.dek?.iterationCount != null && this.init.dek.iterationCount < NIST.minIterationCount) {
      throw new Error(`dek.iterationCount must be least ${NIST.minIterationCount}`)
    }

    const dek = this.init.pass != null && this.init.dek?.salt != null
      ? pbkdf2(
        this.init.pass,
        this.init.dek?.salt,
        this.init.dek?.iterationCount,
        this.init.dek?.keyLength,
        this.init.dek?.hash)
      : ''

    privates.set(this, { dek })
  }

  readonly [Symbol.toStringTag] = '@libp2p/keychain'

  readonly [serviceCapabilities]: string[] = [
    '@libp2p/keychain'
  ]

  /**
   * Generates the options for a keychain.  A random salt is produced.
   *
   * @returns {object}
   */
  static generateOptions (): KeychainInit {
    const options = Object.assign({}, defaultOptions)
    const saltLength = Math.ceil(NIST.minSaltLength / 3) * 3 // no base64 padding
    options.dek.salt = uint8ArrayToString(randomBytes(saltLength), 'base64')
    return options
  }

  /**
   * Gets an object that can encrypt/decrypt protected data.
   * The default options for a keychain.
   *
   * @returns {object}
   */
  static get options (): typeof defaultOptions {
    return defaultOptions
  }

  /**
   * Create a new key.
   *
   * @param {string} name - The local key name; cannot already exist.
   * @param {string} type - One of the key types; 'rsa'.
   * @param {number} [size = 2048] - The key size in bits. Used for rsa keys only
   */
  async createKey (name: string, type: KeyType, size = 2048): Promise<KeyInfo> {
    if (!validateKeyName(name) || name === 'self') {
      await randomDelay()
      throw new InvalidParametersError('Invalid key name')
    }

    if (typeof type !== 'string') {
      await randomDelay()
      throw new InvalidParametersError('Invalid key type')
    }

    const dsname = DsName(name)
    const exists = await this.components.datastore.has(dsname)
    if (exists) {
      await randomDelay()
      throw new InvalidParametersError('Key name already exists')
    }

    switch (type.toLowerCase()) {
      case 'rsa':
        if (!Number.isSafeInteger(size) || size < 2048) {
          await randomDelay()
          throw new InvalidParametersError('Invalid RSA key size')
        }
        break
      default:
        break
    }

    let keyInfo
    try {
      const keypair = await generateKeyPair(type, size)
      const kid = await keypair.id()
      const cached = privates.get(this)

      if (cached == null) {
        throw new InvalidParametersError('dek missing')
      }

      const dek = cached.dek
      const pem = await keypair.export(dek)
      keyInfo = {
        name,
        id: kid
      }
      const batch = this.components.datastore.batch()
      batch.put(dsname, uint8ArrayFromString(pem))
      batch.put(DsInfoName(name), uint8ArrayFromString(JSON.stringify(keyInfo)))

      await batch.commit()
    } catch (err: any) {
      await randomDelay()
      throw err
    }

    return keyInfo
  }

  /**
   * List all the keys.
   *
   * @returns {Promise<KeyInfo[]>}
   */
  async listKeys (): Promise<KeyInfo[]> {
    const query = {
      prefix: infoPrefix
    }

    const info = []
    for await (const value of this.components.datastore.query(query)) {
      info.push(JSON.parse(uint8ArrayToString(value.value)))
    }

    return info
  }

  /**
   * Find a key by it's id
   */
  async findKeyById (id: string): Promise<KeyInfo> {
    try {
      const keys = await this.listKeys()
      const key = keys.find((k) => k.id === id)

      if (key == null) {
        throw new InvalidParametersError(`Key with id '${id}' does not exist.`)
      }

      return key
    } catch (err: any) {
      await randomDelay()
      throw err
    }
  }

  /**
   * Find a key by it's name.
   *
   * @param {string} name - The local key name.
   * @returns {Promise<KeyInfo>}
   */
  async findKeyByName (name: string): Promise<KeyInfo> {
    if (!validateKeyName(name)) {
      await randomDelay()
      throw new InvalidParametersError(`Invalid key name '${name}'`)
    }

    const dsname = DsInfoName(name)
    try {
      const res = await this.components.datastore.get(dsname)
      return JSON.parse(uint8ArrayToString(res))
    } catch (err: any) {
      await randomDelay()
      this.log.error(err)
      throw new NotFoundError(`Key '${name}' does not exist.`)
    }
  }

  /**
   * Remove an existing key.
   *
   * @param {string} name - The local key name; must already exist.
   * @returns {Promise<KeyInfo>}
   */
  async removeKey (name: string): Promise<KeyInfo> {
    if (!validateKeyName(name) || name === 'self') {
      await randomDelay()
      throw new InvalidParametersError(`Invalid key name '${name}'`)
    }
    const dsname = DsName(name)
    const keyInfo = await this.findKeyByName(name)
    const batch = this.components.datastore.batch()
    batch.delete(dsname)
    batch.delete(DsInfoName(name))
    await batch.commit()
    return keyInfo
  }

  /**
   * Rename a key
   *
   * @param {string} oldName - The old local key name; must already exist.
   * @param {string} newName - The new local key name; must not already exist.
   * @returns {Promise<KeyInfo>}
   */
  async renameKey (oldName: string, newName: string): Promise<KeyInfo> {
    if (!validateKeyName(oldName) || oldName === 'self') {
      await randomDelay()
      throw new InvalidParametersError(`Invalid old key name '${oldName}'`)
    }
    if (!validateKeyName(newName) || newName === 'self') {
      await randomDelay()
      throw new InvalidParametersError(`Invalid new key name '${newName}'`)
    }
    const oldDsname = DsName(oldName)
    const newDsname = DsName(newName)
    const oldInfoName = DsInfoName(oldName)
    const newInfoName = DsInfoName(newName)

    const exists = await this.components.datastore.has(newDsname)
    if (exists) {
      await randomDelay()
      throw new InvalidParametersError(`Key '${newName}' already exists`)
    }

    try {
      const pem = await this.components.datastore.get(oldDsname)
      const res = await this.components.datastore.get(oldInfoName)

      const keyInfo = JSON.parse(uint8ArrayToString(res))
      keyInfo.name = newName
      const batch = this.components.datastore.batch()
      batch.put(newDsname, pem)
      batch.put(newInfoName, uint8ArrayFromString(JSON.stringify(keyInfo)))
      batch.delete(oldDsname)
      batch.delete(oldInfoName)
      await batch.commit()
      return keyInfo
    } catch (err: any) {
      await randomDelay()
      throw err
    }
  }

  /**
   * Export an existing key as a PEM encrypted PKCS #8 string
   */
  async exportKey (name: string, password: string): Promise<string> {
    if (!validateKeyName(name)) {
      await randomDelay()
      throw new InvalidParametersError(`Invalid key name '${name}'`)
    }
    if (password == null) {
      await randomDelay()
      throw new InvalidParametersError('Password is required')
    }

    const dsname = DsName(name)
    try {
      const res = await this.components.datastore.get(dsname)
      const pem = uint8ArrayToString(res)
      const cached = privates.get(this)

      if (cached == null) {
        throw new InvalidParametersError('dek missing')
      }

      const dek = cached.dek
      const privateKey = await importKey(pem, dek)
      const keyString = await privateKey.export(password)

      return keyString
    } catch (err: any) {
      await randomDelay()
      throw err
    }
  }

  /**
   * Export an existing key as a PeerId
   */
  async exportPeerId (name: string): Promise<PeerId> {
    const password = 'temporary-password'
    const pem = await this.exportKey(name, password)
    const privateKey = await importKey(pem, password)

    return peerIdFromKeys(privateKey.public.bytes, privateKey.bytes)
  }

  /**
   * Import a new key from a PEM encoded PKCS #8 string
   *
   * @param {string} name - The local key name; must not already exist.
   * @param {string} pem - The PEM encoded PKCS #8 string
   * @param {string} password - The password.
   * @returns {Promise<KeyInfo>}
   */
  async importKey (name: string, pem: string, password: string): Promise<KeyInfo> {
    if (!validateKeyName(name) || name === 'self') {
      await randomDelay()
      throw new InvalidParametersError(`Invalid key name '${name}'`)
    }
    if (pem == null) {
      await randomDelay()
      throw new InvalidParametersError('PEM encoded key is required')
    }
    const dsname = DsName(name)
    const exists = await this.components.datastore.has(dsname)
    if (exists) {
      await randomDelay()
      throw new InvalidParametersError(`Key '${name}' already exists`)
    }

    let privateKey
    try {
      privateKey = await importKey(pem, password)
    } catch (err: any) {
      await randomDelay()
      throw new InvalidParametersError('Cannot read the key, most likely the password is wrong')
    }

    let kid
    try {
      kid = await privateKey.id()
      const cached = privates.get(this)

      if (cached == null) {
        throw new InvalidParametersError('dek missing')
      }

      const dek = cached.dek
      pem = await privateKey.export(dek)
    } catch (err: any) {
      await randomDelay()
      throw err
    }

    const keyInfo = {
      name,
      id: kid
    }
    const batch = this.components.datastore.batch()
    batch.put(dsname, uint8ArrayFromString(pem))
    batch.put(DsInfoName(name), uint8ArrayFromString(JSON.stringify(keyInfo)))
    await batch.commit()

    return keyInfo
  }

  /**
   * Import a peer key
   */
  async importPeer (name: string, peer: PeerId): Promise<KeyInfo> {
    try {
      if (!validateKeyName(name)) {
        throw new InvalidParametersError(`Invalid key name '${name}'`)
      }
      if (peer == null) {
        throw new InvalidParametersError('PeerId is required')
      }
      if (peer.privateKey == null) {
        throw new InvalidParametersError('PeerId.privKey is required')
      }

      const privateKey = await unmarshalPrivateKey(peer.privateKey)

      const dsname = DsName(name)
      const exists = await this.components.datastore.has(dsname)
      if (exists) {
        await randomDelay()
        throw new InvalidParametersError(`Key '${name}' already exists`)
      }

      const cached = privates.get(this)

      if (cached == null) {
        throw new InvalidParametersError('dek missing')
      }

      const dek = cached.dek
      const pem = await privateKey.export(dek)
      const keyInfo: KeyInfo = {
        name,
        id: peer.toString()
      }
      const batch = this.components.datastore.batch()
      batch.put(dsname, uint8ArrayFromString(pem))
      batch.put(DsInfoName(name), uint8ArrayFromString(JSON.stringify(keyInfo)))
      await batch.commit()
      return keyInfo
    } catch (err: any) {
      await randomDelay()
      throw err
    }
  }

  /**
   * Gets the private key as PEM encoded PKCS #8 string
   */
  async getPrivateKey (name: string): Promise<string> {
    if (!validateKeyName(name)) {
      await randomDelay()
      throw new InvalidParametersError(`Invalid key name '${name}'`)
    }

    try {
      const dsname = DsName(name)
      const res = await this.components.datastore.get(dsname)
      return uint8ArrayToString(res)
    } catch (err: any) {
      await randomDelay()
      this.log.error(err)
      throw new InvalidParametersError(`Key '${name}' does not exist.`)
    }
  }

  /**
   * Rotate keychain password and re-encrypt all associated keys
   */
  async rotateKeychainPass (oldPass: string, newPass: string): Promise<void> {
    if (typeof oldPass !== 'string') {
      await randomDelay()
      throw new InvalidParametersError(`Invalid old pass type '${typeof oldPass}'`)
    }
    if (typeof newPass !== 'string') {
      await randomDelay()
      throw new InvalidParametersError(`Invalid new pass type '${typeof newPass}'`)
    }
    if (newPass.length < 20) {
      await randomDelay()
      throw new InvalidParametersError(`Invalid pass length ${newPass.length}`)
    }
    this.log('recreating keychain')
    const cached = privates.get(this)

    if (cached == null) {
      throw new InvalidParametersError('dek missing')
    }

    const oldDek = cached.dek
    this.init.pass = newPass
    const newDek = newPass != null && this.init.dek?.salt != null
      ? pbkdf2(
        newPass,
        this.init.dek.salt,
        this.init.dek?.iterationCount,
        this.init.dek?.keyLength,
        this.init.dek?.hash)
      : ''
    privates.set(this, { dek: newDek })
    const keys = await this.listKeys()
    for (const key of keys) {
      const res = await this.components.datastore.get(DsName(key.name))
      const pem = uint8ArrayToString(res)
      const privateKey = await importKey(pem, oldDek)
      const password = newDek.toString()
      const keyAsPEM = await privateKey.export(password)

      // Update stored key
      const batch = this.components.datastore.batch()
      const keyInfo = {
        name: key.name,
        id: key.id
      }
      batch.put(DsName(key.name), uint8ArrayFromString(keyAsPEM))
      batch.put(DsInfoName(key.name), uint8ArrayFromString(JSON.stringify(keyInfo)))
      await batch.commit()
    }
    this.log('keychain reconstructed')
  }
}
