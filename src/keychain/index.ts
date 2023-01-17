/* eslint max-nested-callbacks: ["error", 5] */

import { logger } from '@libp2p/logger'
import sanitize from 'sanitize-filename'
import mergeOptions from 'merge-options'
import { Key } from 'interface-datastore/key'
import { CMS } from './cms.js'
import errCode from 'err-code'
import { codes } from '../errors.js'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { generateKeyPair, importKey, unmarshalPrivateKey } from '@libp2p/crypto/keys'
import type { PeerId } from '@libp2p/interface-peer-id'
import { pbkdf2, randomBytes } from '@libp2p/crypto'
import type { Startable } from '@libp2p/interfaces/dist/src/startable'
import type { Datastore } from 'interface-datastore'
import { peerIdFromKeys } from '@libp2p/peer-id'
import type { KeyTypes } from '@libp2p/crypto/keys'

const log = logger('libp2p:keychain')

export interface DEKConfig {
  hash: string
  salt: string
  iterationCount: number
  keyLength: number
}

export interface KeyChainInit {
  pass?: string
  dek?: DEKConfig
}

/**
 * Information about a key.
 */
export interface KeyInfo {
  /**
   * The universally unique key id
   */
  id: string

  /**
   * The local key name.
   */
  name: string
}

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

function validateKeyName (name: string) {
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
async function randomDelay () {
  const min = 200
  const max = 1000
  const delay = Math.random() * (max - min) + min

  await new Promise(resolve => setTimeout(resolve, delay))
}

/**
 * Converts a key name into a datastore name
 */
function DsName (name: string) {
  return new Key(keyPrefix + name)
}

/**
 * Converts a key name into a datastore info name
 */
function DsInfoName (name: string) {
  return new Key(infoPrefix + name)
}

export interface KeyChainComponents {
  peerId: PeerId
  datastore: Datastore
}

/**
 * Manages the lifecycle of a key. Keys are encrypted at rest using PKCS #8.
 *
 * A key in the store has two entries
 * - '/info/*key-name*', contains the KeyInfo for the key
 * - '/pkcs8/*key-name*', contains the PKCS #8 for the key
 *
 */
export class KeyChain implements Startable {
  private readonly components: KeyChainComponents
  private readonly init: KeyChainInit
  private started: boolean

  /**
   * Creates a new instance of a key chain
   */
  constructor (components: KeyChainComponents, init: KeyChainInit) {
    this.components = components
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
    this.started = false
  }

  isStarted () {
    return this.started
  }

  async start () {
    const dsname = DsInfoName('self')

    if (!(await this.components.datastore.has(dsname))) {
      await this.importPeer('self', this.components.peerId)
    }

    this.started = true
  }

  stop () {
    this.started = false
  }

  /**
   * Gets an object that can encrypt/decrypt protected data
   * using the Cryptographic Message Syntax (CMS).
   *
   * CMS describes an encapsulation syntax for data protection. It
   * is used to digitally sign, digest, authenticate, or encrypt
   * arbitrary message content
   */
  get cms () {
    const cached = privates.get(this)

    if (cached == null) {
      throw errCode(new Error('dek missing'), codes.ERR_INVALID_PARAMETERS)
    }

    const dek = cached.dek

    return new CMS(this, dek)
  }

  /**
   * Generates the options for a keychain.  A random salt is produced.
   *
   * @returns {object}
   */
  static generateOptions (): KeyChainInit {
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
  static get options () {
    return defaultOptions
  }

  /**
   * Create a new key.
   *
   * @param {string} name - The local key name; cannot already exist.
   * @param {string} type - One of the key types; 'rsa'.
   * @param {number} [size = 2048] - The key size in bits. Used for rsa keys only
   */
  async createKey (name: string, type: KeyTypes, size = 2048): Promise<KeyInfo> {
    if (!validateKeyName(name) || name === 'self') {
      await randomDelay()
      throw errCode(new Error('Invalid key name'), codes.ERR_INVALID_KEY_NAME)
    }

    if (typeof type !== 'string') {
      await randomDelay()
      throw errCode(new Error('Invalid key type'), codes.ERR_INVALID_KEY_TYPE)
    }

    const dsname = DsName(name)
    const exists = await this.components.datastore.has(dsname)
    if (exists) {
      await randomDelay()
      throw errCode(new Error('Key name already exists'), codes.ERR_KEY_ALREADY_EXISTS)
    }

    switch (type.toLowerCase()) {
      case 'rsa':
        if (!Number.isSafeInteger(size) || size < 2048) {
          await randomDelay()
          throw errCode(new Error('Invalid RSA key size'), codes.ERR_INVALID_KEY_SIZE)
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
        throw errCode(new Error('dek missing'), codes.ERR_INVALID_PARAMETERS)
      }

      const dek = cached.dek
      const pem = await keypair.export(dek)
      keyInfo = {
        name: name,
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
  async listKeys () {
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
      return keys.find((k) => k.id === id)
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
      throw errCode(new Error(`Invalid key name '${name}'`), codes.ERR_INVALID_KEY_NAME)
    }

    const dsname = DsInfoName(name)
    try {
      const res = await this.components.datastore.get(dsname)
      return JSON.parse(uint8ArrayToString(res))
    } catch (err: any) {
      await randomDelay()
      log.error(err)
      throw errCode(new Error(`Key '${name}' does not exist.`), codes.ERR_KEY_NOT_FOUND)
    }
  }

  /**
   * Remove an existing key.
   *
   * @param {string} name - The local key name; must already exist.
   * @returns {Promise<KeyInfo>}
   */
  async removeKey (name: string) {
    if (!validateKeyName(name) || name === 'self') {
      await randomDelay()
      throw errCode(new Error(`Invalid key name '${name}'`), codes.ERR_INVALID_KEY_NAME)
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
      throw errCode(new Error(`Invalid old key name '${oldName}'`), codes.ERR_OLD_KEY_NAME_INVALID)
    }
    if (!validateKeyName(newName) || newName === 'self') {
      await randomDelay()
      throw errCode(new Error(`Invalid new key name '${newName}'`), codes.ERR_NEW_KEY_NAME_INVALID)
    }
    const oldDsname = DsName(oldName)
    const newDsname = DsName(newName)
    const oldInfoName = DsInfoName(oldName)
    const newInfoName = DsInfoName(newName)

    const exists = await this.components.datastore.has(newDsname)
    if (exists) {
      await randomDelay()
      throw errCode(new Error(`Key '${newName}' already exists`), codes.ERR_KEY_ALREADY_EXISTS)
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
  async exportKey (name: string, password: string) {
    if (!validateKeyName(name)) {
      await randomDelay()
      throw errCode(new Error(`Invalid key name '${name}'`), codes.ERR_INVALID_KEY_NAME)
    }
    if (password == null) {
      await randomDelay()
      throw errCode(new Error('Password is required'), codes.ERR_PASSWORD_REQUIRED)
    }

    const dsname = DsName(name)
    try {
      const res = await this.components.datastore.get(dsname)
      const pem = uint8ArrayToString(res)
      const cached = privates.get(this)

      if (cached == null) {
        throw errCode(new Error('dek missing'), codes.ERR_INVALID_PARAMETERS)
      }

      const dek = cached.dek
      const privateKey = await importKey(pem, dek)
      return await privateKey.export(password)
    } catch (err: any) {
      await randomDelay()
      throw err
    }
  }

  /**
   * Export an existing key as a PeerId
   */
  async exportPeerId (name: string) {
    const password = 'temporary-password'
    const pem = await this.exportKey(name, password)
    const privateKey = await importKey(pem, password)

    return await peerIdFromKeys(privateKey.public.bytes, privateKey.bytes)
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
      throw errCode(new Error(`Invalid key name '${name}'`), codes.ERR_INVALID_KEY_NAME)
    }
    if (pem == null) {
      await randomDelay()
      throw errCode(new Error('PEM encoded key is required'), codes.ERR_PEM_REQUIRED)
    }
    const dsname = DsName(name)
    const exists = await this.components.datastore.has(dsname)
    if (exists) {
      await randomDelay()
      throw errCode(new Error(`Key '${name}' already exists`), codes.ERR_KEY_ALREADY_EXISTS)
    }

    let privateKey
    try {
      privateKey = await importKey(pem, password)
    } catch (err: any) {
      await randomDelay()
      throw errCode(new Error('Cannot read the key, most likely the password is wrong'), codes.ERR_CANNOT_READ_KEY)
    }

    let kid
    try {
      kid = await privateKey.id()
      const cached = privates.get(this)

      if (cached == null) {
        throw errCode(new Error('dek missing'), codes.ERR_INVALID_PARAMETERS)
      }

      const dek = cached.dek
      pem = await privateKey.export(dek)
    } catch (err: any) {
      await randomDelay()
      throw err
    }

    const keyInfo = {
      name: name,
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
        throw errCode(new Error(`Invalid key name '${name}'`), codes.ERR_INVALID_KEY_NAME)
      }
      if (peer == null) {
        throw errCode(new Error('PeerId is required'), codes.ERR_MISSING_PRIVATE_KEY)
      }
      if (peer.privateKey == null) {
        throw errCode(new Error('PeerId.privKey is required'), codes.ERR_MISSING_PRIVATE_KEY)
      }

      const privateKey = await unmarshalPrivateKey(peer.privateKey)

      const dsname = DsName(name)
      const exists = await this.components.datastore.has(dsname)
      if (exists) {
        await randomDelay()
        throw errCode(new Error(`Key '${name}' already exists`), codes.ERR_KEY_ALREADY_EXISTS)
      }

      const cached = privates.get(this)

      if (cached == null) {
        throw errCode(new Error('dek missing'), codes.ERR_INVALID_PARAMETERS)
      }

      const dek = cached.dek
      const pem = await privateKey.export(dek)
      const keyInfo: KeyInfo = {
        name: name,
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
      throw errCode(new Error(`Invalid key name '${name}'`), codes.ERR_INVALID_KEY_NAME)
    }

    try {
      const dsname = DsName(name)
      const res = await this.components.datastore.get(dsname)
      return uint8ArrayToString(res)
    } catch (err: any) {
      await randomDelay()
      log.error(err)
      throw errCode(new Error(`Key '${name}' does not exist.`), codes.ERR_KEY_NOT_FOUND)
    }
  }

  /**
   * Rotate keychain password and re-encrypt all associated keys
   */
  async rotateKeychainPass (oldPass: string, newPass: string) {
    if (typeof oldPass !== 'string') {
      await randomDelay()
      throw errCode(new Error(`Invalid old pass type '${typeof oldPass}'`), codes.ERR_INVALID_OLD_PASS_TYPE)
    }
    if (typeof newPass !== 'string') {
      await randomDelay()
      throw errCode(new Error(`Invalid new pass type '${typeof newPass}'`), codes.ERR_INVALID_NEW_PASS_TYPE)
    }
    if (newPass.length < 20) {
      await randomDelay()
      throw errCode(new Error(`Invalid pass length ${newPass.length}`), codes.ERR_INVALID_PASS_LENGTH)
    }
    log('recreating keychain')
    const cached = privates.get(this)

    if (cached == null) {
      throw errCode(new Error('dek missing'), codes.ERR_INVALID_PARAMETERS)
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
    log('keychain reconstructed')
  }
}
