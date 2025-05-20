/* eslint max-nested-callbacks: ["error", 5] */

import { pbkdf2, randomBytes } from '@libp2p/crypto'
import { privateKeyToProtobuf } from '@libp2p/crypto/keys'
import { InvalidParametersError, NotFoundError, serviceCapabilities } from '@libp2p/interface'
import { mergeOptions } from '@libp2p/utils/merge-options'
import { Key } from 'interface-datastore/key'
import { base58btc } from 'multiformats/bases/base58'
import { sha256 } from 'multiformats/hashes/sha2'
import sanitize from 'sanitize-filename'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { exportPrivateKey } from './utils/export.js'
import { importPrivateKey } from './utils/import.js'
import type { KeychainComponents, KeychainInit, Keychain as KeychainInterface, KeyInfo } from './index.js'
import type { Logger, PrivateKey } from '@libp2p/interface'

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

export async function keyId (key: PrivateKey): Promise<string> {
  const pb = privateKeyToProtobuf(key)
  const hash = await sha256.digest(pb)

  return base58btc.encode(hash.bytes).substring(1)
}

/**
 * Manages the life cycle of a key. Keys are encrypted at rest using PKCS #8.
 *
 * A key in the store has two entries
 * - '/info/*key-name*', contains the KeyInfo for the key
 * - '/pkcs8/*key-name*', contains the PKCS #8 for the key
 *
 */
export class Keychain implements KeychainInterface {
  private readonly components: KeychainComponents
  private readonly init: KeychainInit
  private readonly log: Logger
  private readonly self: string

  /**
   * Creates a new instance of a key chain
   */
  constructor (components: KeychainComponents, init: KeychainInit) {
    this.components = components
    this.log = components.logger.forComponent('libp2p:keychain')
    this.init = mergeOptions(defaultOptions, init)
    this.self = init.selfKey ?? 'self'

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

  async findKeyByName (name: string): Promise<KeyInfo> {
    if (!validateKeyName(name)) {
      await randomDelay()
      throw new InvalidParametersError(`Invalid key name '${name}'`)
    }

    const datastoreName = DsInfoName(name)

    try {
      const res = await this.components.datastore.get(datastoreName)
      return JSON.parse(uint8ArrayToString(res))
    } catch (err: any) {
      await randomDelay()
      this.log.error(err)
      throw new NotFoundError(`Key '${name}' does not exist.`)
    }
  }

  async findKeyById (id: string): Promise<KeyInfo> {
    try {
      const query = {
        prefix: infoPrefix
      }

      for await (const value of this.components.datastore.query(query)) {
        const key = JSON.parse(uint8ArrayToString(value.value))

        if (key.id === id) {
          return key
        }
      }

      throw new InvalidParametersError(`Key with id '${id}' does not exist.`)
    } catch (err: any) {
      await randomDelay()
      throw err
    }
  }

  async importKey (name: string, key: PrivateKey): Promise<KeyInfo> {
    if (!validateKeyName(name)) {
      await randomDelay()
      throw new InvalidParametersError(`Invalid key name '${name}'`)
    }
    if (key == null) {
      await randomDelay()
      throw new InvalidParametersError('Key is required')
    }
    const datastoreName = DsName(name)
    const exists = await this.components.datastore.has(datastoreName)
    if (exists) {
      await randomDelay()
      throw new InvalidParametersError(`Key '${name}' already exists`)
    }

    let kid: string
    let pem: string
    try {
      kid = await keyId(key)
      const cached = privates.get(this)

      if (cached == null) {
        throw new InvalidParametersError('dek missing')
      }

      const dek = cached.dek
      pem = await exportPrivateKey(key, dek, key.type === 'RSA' ? 'pkcs-8' : 'libp2p-key')
    } catch (err: any) {
      await randomDelay()
      throw err
    }

    const keyInfo = {
      name,
      id: kid
    }
    const batch = this.components.datastore.batch()
    batch.put(datastoreName, uint8ArrayFromString(pem))
    batch.put(DsInfoName(name), uint8ArrayFromString(JSON.stringify(keyInfo)))
    await batch.commit()

    return keyInfo
  }

  async exportKey (name: string): Promise<PrivateKey> {
    if (!validateKeyName(name)) {
      await randomDelay()
      throw new InvalidParametersError(`Invalid key name '${name}'`)
    }

    const datastoreName = DsName(name)
    try {
      const res = await this.components.datastore.get(datastoreName)
      const pem = uint8ArrayToString(res)
      const cached = privates.get(this)

      if (cached == null) {
        throw new InvalidParametersError('dek missing')
      }

      const dek = cached.dek

      return await importPrivateKey(pem, dek)
    } catch (err: any) {
      await randomDelay()
      throw err
    }
  }

  async removeKey (name: string): Promise<KeyInfo> {
    if (!validateKeyName(name) || name === this.self) {
      await randomDelay()
      throw new InvalidParametersError(`Invalid key name '${name}'`)
    }

    const datastoreName = DsName(name)
    const keyInfo = await this.findKeyByName(name)
    const batch = this.components.datastore.batch()
    batch.delete(datastoreName)
    batch.delete(DsInfoName(name))
    await batch.commit()

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
   * Rename a key
   *
   * @param {string} oldName - The old local key name; must already exist.
   * @param {string} newName - The new local key name; must not already exist.
   * @returns {Promise<KeyInfo>}
   */
  async renameKey (oldName: string, newName: string): Promise<KeyInfo> {
    if (!validateKeyName(oldName) || oldName === this.self) {
      await randomDelay()
      throw new InvalidParametersError(`Invalid old key name '${oldName}'`)
    }
    if (!validateKeyName(newName) || newName === this.self) {
      await randomDelay()
      throw new InvalidParametersError(`Invalid new key name '${newName}'`)
    }
    const oldDatastoreName = DsName(oldName)
    const newDatastoreName = DsName(newName)
    const oldInfoName = DsInfoName(oldName)
    const newInfoName = DsInfoName(newName)

    const exists = await this.components.datastore.has(newDatastoreName)
    if (exists) {
      await randomDelay()
      throw new InvalidParametersError(`Key '${newName}' already exists`)
    }

    try {
      const pem = await this.components.datastore.get(oldDatastoreName)
      const res = await this.components.datastore.get(oldInfoName)

      const keyInfo = JSON.parse(uint8ArrayToString(res))
      keyInfo.name = newName
      const batch = this.components.datastore.batch()
      batch.put(newDatastoreName, pem)
      batch.put(newInfoName, uint8ArrayFromString(JSON.stringify(keyInfo)))
      batch.delete(oldDatastoreName)
      batch.delete(oldInfoName)
      await batch.commit()
      return keyInfo
    } catch (err: any) {
      await randomDelay()
      throw err
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
      const privateKey = await importPrivateKey(pem, oldDek)
      const password = newDek.toString()
      const keyAsPEM = await exportPrivateKey(privateKey, password, privateKey.type === 'RSA' ? 'pkcs-8' : 'libp2p-key')

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
