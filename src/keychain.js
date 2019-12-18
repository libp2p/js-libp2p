/* eslint max-nested-callbacks: ["error", 5] */
'use strict'

const sanitize = require('sanitize-filename')
const mergeOptions = require('merge-options')
const crypto = require('libp2p-crypto')
const DS = require('interface-datastore')
const promisify = require('promisify-es6')
const CMS = require('./cms')
const errcode = require('err-code')

const keyPrefix = '/pkcs8/'
const infoPrefix = '/info/'

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
 * @param {string | Error} err - The error
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
 * @returns {DS.Key}
 * @private
 */
function DsName (name) {
  return new DS.Key(keyPrefix + name)
}

/**
 * Converts a key name into a datastore info name.
 *
 * @param {string} name
 * @returns {DS.Key}
 * @private
 */
function DsInfoName (name) {
  return new DS.Key(infoPrefix + name)
}

/**
 * Information about a key.
 *
 * @typedef {Object} KeyInfo
 *
 * @property {string} id - The universally unique key id.
 * @property {string} name - The local key name.
 */

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
   * @param {DS} store - where the key are.
   * @param {object} options - ???
   */
  constructor (store, options) {
    if (!store) {
      throw new Error('store is required')
    }
    this.store = store

    const opts = mergeOptions(defaultOptions, options)

    // Enforce NIST SP 800-132
    if (!opts.passPhrase || opts.passPhrase.length < 20) {
      throw new Error('passPhrase must be least 20 characters')
    }
    if (opts.dek.keyLength < NIST.minKeyLength) {
      throw new Error(`dek.keyLength must be least ${NIST.minKeyLength} bytes`)
    }
    if (opts.dek.salt.length < NIST.minSaltLength) {
      throw new Error(`dek.saltLength must be least ${NIST.minSaltLength} bytes`)
    }
    if (opts.dek.iterationCount < NIST.minIterationCount) {
      throw new Error(`dek.iterationCount must be least ${NIST.minIterationCount}`)
    }

    // Create the derived encrypting key
    const dek = crypto.pbkdf2(
      opts.passPhrase,
      opts.dek.salt,
      opts.dek.iterationCount,
      opts.dek.keyLength,
      opts.dek.hash)
    Object.defineProperty(this, '_', { value: () => dek })
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
    return new CMS(this)
  }

  /**
   * Generates the options for a keychain.  A random salt is produced.
   *
   * @returns {object}
   */
  static generateOptions () {
    const options = Object.assign({}, defaultOptions)
    const saltLength = Math.ceil(NIST.minSaltLength / 3) * 3 // no base64 padding
    options.dek.salt = crypto.randomBytes(saltLength).toString('base64')
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
   * @param {int} size - The key size in bits.
    * @returns {KeyInfo}
   */
  async createKey (name, type, size) {
    const self = this

    if (!validateKeyName(name) || name === 'self') {
      return throwDelayed(errcode(new Error(`Invalid key name '${name}'`), 'ERR_INVALID_KEY_NAME'))
    }

    if (typeof type !== 'string') {
      return throwDelayed(errcode(new Error(`Invalid key type '${type}'`), 'ERR_INVALID_KEY_TYPE'))
    }

    if (!Number.isSafeInteger(size)) {
      return throwDelayed(errcode(new Error(`Invalid key size '${size}'`), 'ERR_INVALID_KEY_SIZE'))
    }

    const dsname = DsName(name)
    const exists = await self.store.has(dsname)
    if (exists) return throwDelayed(errcode(new Error(`Key '${name}' already exists`), 'ERR_KEY_ALREADY_EXISTS'))

    switch (type.toLowerCase()) {
      case 'rsa':
        if (size < 2048) {
          return throwDelayed(errcode(new Error(`Invalid RSA key size ${size}`), 'ERR_INVALID_KEY_SIZE'))
        }
        break
      default:
        break
    }

    let keyInfo
    try {
      const keypair = await promisify(crypto.keys.generateKeyPair, {
        context: crypto.keys
      })(type, size)

      const kid = await promisify(keypair.id, {
        context: keypair
      })()
      const pem = await promisify(keypair.export, {
        context: keypair
      })(this._())
      keyInfo = {
        name: name,
        id: kid
      }
      const batch = self.store.batch()
      batch.put(dsname, pem)
      batch.put(DsInfoName(name), JSON.stringify(keyInfo))

      await batch.commit()
    } catch (err) {
      return throwDelayed(err)
    }

    return keyInfo
  }

  /**
   * List all the keys.
   *
    * @returns {KeyInfo[]}
   */
  async listKeys () {
    const self = this
    const query = {
      prefix: infoPrefix
    }

    const info = []
    for await (const value of self.store.query(query)) {
      info.push(JSON.parse(value.value))
    }

    return info
  }

  /**
   * Find a key by it's id.
   *
   * @param {string} id - The universally unique key identifier.
    * @returns {KeyInfo}
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
    * @returns {KeyInfo}
   */
  async findKeyByName (name) {
    if (!validateKeyName(name)) {
      return throwDelayed(errcode(new Error(`Invalid key name '${name}'`), 'ERR_INVALID_KEY_NAME'))
    }

    const dsname = DsInfoName(name)
    try {
      const res = await this.store.get(dsname)
      return JSON.parse(res.toString())
    } catch (err) {
      return throwDelayed(errcode(new Error(`Key '${name}' does not exist. ${err.message}`), 'ERR_KEY_NOT_FOUND'))
    }
  }

  /**
   * Remove an existing key.
   *
   * @param {string} name - The local key name; must already exist.
    * @returns {KeyInfo}
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
    * @returns {KeyInfo}
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
      let res = await this.store.get(oldDsname)
      const pem = res.toString()
      res = await self.store.get(oldInfoName)

      const keyInfo = JSON.parse(res.toString())
      keyInfo.name = newName
      const batch = self.store.batch()
      batch.put(newDsname, pem)
      batch.put(newInfoName, JSON.stringify(keyInfo))
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
    * @returns {string}
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
      const pem = res.toString()
      const privateKey = await promisify(crypto.keys.import, {
        context: crypto.keys
      })(pem, this._())
      return promisify(privateKey.export, {
        context: privateKey
      })(password)
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
    * @returns {KeyInfo}
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
      privateKey = await promisify(crypto.keys.import, {
        context: crypto.keys
      })(pem, password)
    } catch (err) {
      return throwDelayed(errcode(new Error('Cannot read the key, most likely the password is wrong'), 'ERR_CANNOT_READ_KEY'))
    }

    let kid
    try {
      kid = await promisify(privateKey.id, {
        context: privateKey
      })()
      pem = await promisify(privateKey.export, {
        context: privateKey
      })(this._())
    } catch (err) {
      return throwDelayed(err)
    }

    const keyInfo = {
      name: name,
      id: kid
    }
    const batch = self.store.batch()
    batch.put(dsname, pem)
    batch.put(DsInfoName(name), JSON.stringify(keyInfo))
    await batch.commit()

    return keyInfo
  }

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
      const kid = await promisify(privateKey.id, {
        context: privateKey
      })()
      const pem = await promisify(privateKey.export, {
        context: privateKey
      })(this._())
      const keyInfo = {
        name: name,
        id: kid
      }
      const batch = self.store.batch()
      batch.put(dsname, pem)
      batch.put(DsInfoName(name), JSON.stringify(keyInfo))
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
    * @returns {string}
   * @private
   */
  async _getPrivateKey (name) {
    if (!validateKeyName(name)) {
      return throwDelayed(errcode(new Error(`Invalid key name '${name}'`), 'ERR_INVALID_KEY_NAME'))
    }

    try {
      const dsname = DsName(name)
      const res = await this.store.get(dsname)
      return res.toString()
    } catch (err) {
      return throwDelayed(errcode(new Error(`Key '${name}' does not exist. ${err.message}`), 'ERR_KEY_NOT_FOUND'))
    }
  }
}

module.exports = Keychain
