/* eslint max-nested-callbacks: ["error", 5] */
'use strict'
const debug = require('debug')
const log = Object.assign(debug('libp2p:keychain'), {
  error: debug('libp2p:keychain:err')
})
const sanitize = require('sanitize-filename')
const mergeOptions = require('merge-options')
const crypto = require('libp2p-crypto')
const { Key } = require('interface-datastore/key')
const CMS = require('./cms')
const errcode = require('err-code')
const { toString: uint8ArrayToString } = require('uint8arrays/to-string')
const { fromString: uint8ArrayFromString } = require('uint8arrays/from-string')

// @ts-ignore node-forge sha512 types not exported
require('node-forge/lib/sha512')

/**
 * @typedef {import('peer-id')} PeerId
 * @typedef {import('interface-datastore').Datastore} Datastore
 */

/**
 * @typedef {Object} DekOptions
 * @property {string} hash
 * @property {string} salt
 * @property {number} iterationCount
 * @property {number} keyLength
 *
 * @typedef {Object} KeychainOptions
 * @property {string} [pass]
 * @property {DekOptions} [dek]
 */

/**
 * Information about a key.
 *
 * @typedef {Object} KeyInfo
 * @property {string} id - The universally unique key id.
 * @property {string} name - The local key name.
 */

const keyPrefix = '/pkcs8/'
const infoPrefix = '/info/'
const privates = new WeakMap()

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

/**
 * @param {string} name
 */
function validateKeyName (name) {
  if (!name) return false
  if (typeof name !== 'string') return false
  return name === sanitize(name.trim())
}

/**
 * Throws an error after a delay
 *
 * This assumes than an error indicates that the keychain is under attack. Delay returning an
 * error to make brute force attacks harder.
 *
 * @param {string|Error} err - The error
 * @returns {Promise<never>}
 * @private
 */
async function throwDelayed (err) {
  const min = 200
  const max = 1000
  const delay = Math.random() * (max - min) + min

  await new Promise(resolve => setTimeout(resolve, delay))
  throw err
}

/**
 * Converts a key name into a datastore name.
 *
 * @param {string} name
 * @returns {Key}
 * @private
 */
function DsName (name) {
  return new Key(keyPrefix + name)
}

/**
 * Converts a key name into a datastore info name.
 *
 * @param {string} name
 * @returns {Key}
 * @private
 */
function DsInfoName (name) {
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
class Keychain {
  /**
   * Creates a new instance of a key chain.
   *
   * @param {Datastore} store - where the key are.
   * @param {KeychainOptions} options
   * @class
   */
  constructor (store, options) {
    if (!store) {
      throw new Error('store is required')
    }
    this.store = store

    this.opts = mergeOptions(defaultOptions, options)

    // Enforce NIST SP 800-132
    if (this.opts.pass && this.opts.pass.length < 20) {
      throw new Error('pass must be least 20 characters')
    }
    if (this.opts.dek.keyLength < NIST.minKeyLength) {
      throw new Error(`dek.keyLength must be least ${NIST.minKeyLength} bytes`)
    }
    if (this.opts.dek.salt.length < NIST.minSaltLength) {
      throw new Error(`dek.saltLength must be least ${NIST.minSaltLength} bytes`)
    }
    if (this.opts.dek.iterationCount < NIST.minIterationCount) {
      throw new Error(`dek.iterationCount must be least ${NIST.minIterationCount}`)
    }

    const dek = this.opts.pass
      ? crypto.pbkdf2(
        this.opts.pass,
        this.opts.dek.salt,
        this.opts.dek.iterationCount,
        this.opts.dek.keyLength,
        this.opts.dek.hash)
      : ''

    privates.set(this, { dek })
  }

  /**
   * Gets an object that can encrypt/decrypt protected data
   * using the Cryptographic Message Syntax (CMS).
   *
   * CMS describes an encapsulation syntax for data protection. It
   * is used to digitally sign, digest, authenticate, or encrypt
   * arbitrary message content.
   *
   * @returns {CMS}
   */
  get cms () {
    return new CMS(this, privates.get(this).dek)
  }

  /**
   * Generates the options for a keychain.  A random salt is produced.
   *
   * @returns {Object}
   */
  static generateOptions () {
    const options = Object.assign({}, defaultOptions)
    const saltLength = Math.ceil(NIST.minSaltLength / 3) * 3 // no base64 padding
    options.dek.salt = uint8ArrayToString(crypto.randomBytes(saltLength), 'base64')
    return options
  }

  /**
   * Gets an object that can encrypt/decrypt protected data.
   * The default options for a keychain.
   *
   * @returns {Object}
   */
  static get options () {
    return defaultOptions
  }

  /**
   * Create a new key.
   *
   * @param {string} name - The local key name; cannot already exist.
   * @param {string} type - One of the key types; 'rsa'.
   * @param {number} [size = 2048] - The key size in bits. Used for rsa keys only.
   * @returns {Promise<KeyInfo>}
   */
  async createKey (name, type, size = 2048) {
    const self = this

    if (!validateKeyName(name) || name === 'self') {
      return throwDelayed(errcode(new Error(`Invalid key name '${name}'`), 'ERR_INVALID_KEY_NAME'))
    }

    if (typeof type !== 'string') {
      return throwDelayed(errcode(new Error(`Invalid key type '${type}'`), 'ERR_INVALID_KEY_TYPE'))
    }

    const dsname = DsName(name)
    const exists = await self.store.has(dsname)
    if (exists) return throwDelayed(errcode(new Error(`Key '${name}' already exists`), 'ERR_KEY_ALREADY_EXISTS'))

    switch (type.toLowerCase()) {
      case 'rsa':
        if (!Number.isSafeInteger(size) || size < 2048) {
          return throwDelayed(errcode(new Error(`Invalid RSA key size ${size}`), 'ERR_INVALID_KEY_SIZE'))
        }
        break
      default:
        break
    }

    let keyInfo
    try {
      // @ts-ignore Differences between several crypto return types need to be fixed in libp2p-crypto
      const keypair = await crypto.keys.generateKeyPair(type, size)
      const kid = await keypair.id()
      /** @type {string} */
      const dek = privates.get(this).dek
      const pem = await keypair.export(dek)
      keyInfo = {
        name: name,
        id: kid
      }
      const batch = self.store.batch()
      batch.put(dsname, uint8ArrayFromString(pem))
      batch.put(DsInfoName(name), uint8ArrayFromString(JSON.stringify(keyInfo)))

      await batch.commit()
    } catch (err) {
      return throwDelayed(err)
    }

    return keyInfo
  }

  /**
   * List all the keys.
   *
   * @returns {Promise<KeyInfo[]>}
   */
  async listKeys () {
    const self = this
    const query = {
      prefix: infoPrefix
    }

    const info = []
    for await (const value of self.store.query(query)) {
      info.push(JSON.parse(uint8ArrayToString(value.value)))
    }

    return info
  }

  /**
   * Find a key by it's id.
   *
   * @param {string} id - The universally unique key identifier.
   * @returns {Promise<KeyInfo|undefined>}
   */
  async findKeyById (id) {
    try {
      const keys = await this.listKeys()
      return keys.find((k) => k.id === id)
    } catch (err) {
      return throwDelayed(err)
    }
  }

  /**
   * Find a key by it's name.
   *
   * @param {string} name - The local key name.
   * @returns {Promise<KeyInfo>}
   */
  async findKeyByName (name) {
    if (!validateKeyName(name)) {
      return throwDelayed(errcode(new Error(`Invalid key name '${name}'`), 'ERR_INVALID_KEY_NAME'))
    }

    const dsname = DsInfoName(name)
    try {
      const res = await this.store.get(dsname)
      return JSON.parse(uint8ArrayToString(res))
    } catch (err) {
      return throwDelayed(errcode(new Error(`Key '${name}' does not exist. ${err.message}`), 'ERR_KEY_NOT_FOUND'))
    }
  }

  /**
   * Remove an existing key.
   *
   * @param {string} name - The local key name; must already exist.
   * @returns {Promise<KeyInfo>}
   */
  async removeKey (name) {
    const self = this
    if (!validateKeyName(name) || name === 'self') {
      return throwDelayed(errcode(new Error(`Invalid key name '${name}'`), 'ERR_INVALID_KEY_NAME'))
    }
    const dsname = DsName(name)
    const keyInfo = await self.findKeyByName(name)
    const batch = self.store.batch()
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
  async renameKey (oldName, newName) {
    const self = this
    if (!validateKeyName(oldName) || oldName === 'self') {
      return throwDelayed(errcode(new Error(`Invalid old key name '${oldName}'`), 'ERR_OLD_KEY_NAME_INVALID'))
    }
    if (!validateKeyName(newName) || newName === 'self') {
      return throwDelayed(errcode(new Error(`Invalid new key name '${newName}'`), 'ERR_NEW_KEY_NAME_INVALID'))
    }
    const oldDsname = DsName(oldName)
    const newDsname = DsName(newName)
    const oldInfoName = DsInfoName(oldName)
    const newInfoName = DsInfoName(newName)

    const exists = await self.store.has(newDsname)
    if (exists) return throwDelayed(errcode(new Error(`Key '${newName}' already exists`), 'ERR_KEY_ALREADY_EXISTS'))

    try {
      const pem = await self.store.get(oldDsname)
      const res = await self.store.get(oldInfoName)

      const keyInfo = JSON.parse(uint8ArrayToString(res))
      keyInfo.name = newName
      const batch = self.store.batch()
      batch.put(newDsname, pem)
      batch.put(newInfoName, uint8ArrayFromString(JSON.stringify(keyInfo)))
      batch.delete(oldDsname)
      batch.delete(oldInfoName)
      await batch.commit()
      return keyInfo
    } catch (err) {
      return throwDelayed(err)
    }
  }

  /**
   * Export an existing key as a PEM encrypted PKCS #8 string
   *
   * @param {string} name - The local key name; must already exist.
   * @param {string} password - The password
   * @returns {Promise<string>}
   */
  async exportKey (name, password) {
    if (!validateKeyName(name)) {
      return throwDelayed(errcode(new Error(`Invalid key name '${name}'`), 'ERR_INVALID_KEY_NAME'))
    }
    if (!password) {
      return throwDelayed(errcode(new Error('Password is required'), 'ERR_PASSWORD_REQUIRED'))
    }

    const dsname = DsName(name)
    try {
      const res = await this.store.get(dsname)
      const pem = uint8ArrayToString(res)
      /** @type {string} */
      const dek = privates.get(this).dek
      const privateKey = await crypto.keys.import(pem, dek)
      return privateKey.export(password)
    } catch (err) {
      return throwDelayed(err)
    }
  }

  /**
   * Import a new key from a PEM encoded PKCS #8 string
   *
   * @param {string} name - The local key name; must not already exist.
   * @param {string} pem - The PEM encoded PKCS #8 string
   * @param {string} password - The password.
   * @returns {Promise<KeyInfo>}
   */
  async importKey (name, pem, password) {
    const self = this
    if (!validateKeyName(name) || name === 'self') {
      return throwDelayed(errcode(new Error(`Invalid key name '${name}'`), 'ERR_INVALID_KEY_NAME'))
    }
    if (!pem) {
      return throwDelayed(errcode(new Error('PEM encoded key is required'), 'ERR_PEM_REQUIRED'))
    }
    const dsname = DsName(name)
    const exists = await self.store.has(dsname)
    if (exists) return throwDelayed(errcode(new Error(`Key '${name}' already exists`), 'ERR_KEY_ALREADY_EXISTS'))

    let privateKey
    try {
      privateKey = await crypto.keys.import(pem, password)
    } catch (err) {
      return throwDelayed(errcode(new Error('Cannot read the key, most likely the password is wrong'), 'ERR_CANNOT_READ_KEY'))
    }

    let kid
    try {
      kid = await privateKey.id()
      /** @type {string} */
      const dek = privates.get(this).dek
      pem = await privateKey.export(dek)
    } catch (err) {
      return throwDelayed(err)
    }

    const keyInfo = {
      name: name,
      id: kid
    }
    const batch = self.store.batch()
    batch.put(dsname, uint8ArrayFromString(pem))
    batch.put(DsInfoName(name), uint8ArrayFromString(JSON.stringify(keyInfo)))
    await batch.commit()

    return keyInfo
  }

  /**
   * Import a peer key
   *
   * @param {string} name - The local key name; must not already exist.
   * @param {PeerId} peer - The PEM encoded PKCS #8 string
   * @returns {Promise<KeyInfo>}
   */
  async importPeer (name, peer) {
    const self = this
    if (!validateKeyName(name)) {
      return throwDelayed(errcode(new Error(`Invalid key name '${name}'`), 'ERR_INVALID_KEY_NAME'))
    }
    if (!peer || !peer.privKey) {
      return throwDelayed(errcode(new Error('Peer.privKey is required'), 'ERR_MISSING_PRIVATE_KEY'))
    }

    const privateKey = peer.privKey
    const dsname = DsName(name)
    const exists = await self.store.has(dsname)
    if (exists) return throwDelayed(errcode(new Error(`Key '${name}' already exists`), 'ERR_KEY_ALREADY_EXISTS'))

    try {
      const kid = await privateKey.id()
      /** @type {string} */
      const dek = privates.get(this).dek
      const pem = await privateKey.export(dek)
      const keyInfo = {
        name: name,
        id: kid
      }
      const batch = self.store.batch()
      batch.put(dsname, uint8ArrayFromString(pem))
      batch.put(DsInfoName(name), uint8ArrayFromString(JSON.stringify(keyInfo)))
      await batch.commit()
      return keyInfo
    } catch (err) {
      return throwDelayed(err)
    }
  }

  /**
   * Gets the private key as PEM encoded PKCS #8 string.
   *
   * @param {string} name
   * @returns {Promise<string>}
   */
  async _getPrivateKey (name) {
    if (!validateKeyName(name)) {
      return throwDelayed(errcode(new Error(`Invalid key name '${name}'`), 'ERR_INVALID_KEY_NAME'))
    }

    try {
      const dsname = DsName(name)
      const res = await this.store.get(dsname)
      return uint8ArrayToString(res)
    } catch (err) {
      return throwDelayed(errcode(new Error(`Key '${name}' does not exist. ${err.message}`), 'ERR_KEY_NOT_FOUND'))
    }
  }

  /**
   * Rotate keychain password and re-encrypt all assosciated keys
   *
   * @param {string} oldPass - The old local keychain password
   * @param {string} newPass - The new local keychain password
   */
  async rotateKeychainPass (oldPass, newPass) {
    if (typeof oldPass !== 'string') {
      return throwDelayed(errcode(new Error(`Invalid old pass type '${typeof oldPass}'`), 'ERR_INVALID_OLD_PASS_TYPE'))
    }
    if (typeof newPass !== 'string') {
      return throwDelayed(errcode(new Error(`Invalid new pass type '${typeof newPass}'`), 'ERR_INVALID_NEW_PASS_TYPE'))
    }
    if (newPass.length < 20) {
      return throwDelayed(errcode(new Error(`Invalid pass length ${newPass.length}`), 'ERR_INVALID_PASS_LENGTH'))
    }
    log('recreating keychain')
    const oldDek = privates.get(this).dek
    this.opts.pass = newPass
    const newDek = newPass
      ? crypto.pbkdf2(
        newPass,
        this.opts.dek.salt,
        this.opts.dek.iterationCount,
        this.opts.dek.keyLength,
        this.opts.dek.hash)
      : ''
    privates.set(this, { dek: newDek })
    const keys = await this.listKeys()
    for (const key of keys) {
      const res = await this.store.get(DsName(key.name))
      const pem = uint8ArrayToString(res)
      const privateKey = await crypto.keys.import(pem, oldDek)
      const password = newDek.toString()
      const keyAsPEM = await privateKey.export(password)

      // Update stored key
      const batch = this.store.batch()
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

module.exports = Keychain
