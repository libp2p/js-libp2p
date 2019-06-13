/* eslint max-nested-callbacks: ["error", 5] */
'use strict'

const sanitize = require('sanitize-filename')
const mergeOptions = require('merge-options')
const crypto = require('libp2p-crypto')
const DS = require('interface-datastore')
const collect = require('pull-stream/sinks/collect')
const pull = require('pull-stream/pull')
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
 * Returns an error to the caller, after a delay
 *
 * This assumes than an error indicates that the keychain is under attack. Delay returning an
 * error to make brute force attacks harder.
 *
 * @param {function(Error)} callback - The caller
 * @param {string | Error} err - The error
 * @returns {undefined}
 * @private
 */
function _error (callback, err) {
  const min = 200
  const max = 1000
  const delay = Math.random() * (max - min) + min

  setTimeout(callback, delay, err, null)
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
   * @param {function(Error, KeyInfo)} callback
   * @returns {undefined}
   */
  createKey (name, type, size, callback) {
    const self = this

    if (!validateKeyName(name) || name === 'self') {
      return _error(callback, errcode(new Error(`Invalid key name '${name}'`), 'ERR_INVALID_KEY_NAME'))
    }

    if (typeof type !== 'string') {
      return _error(callback, errcode(new Error(`Invalid key type '${type}'`), 'ERR_INVALID_KEY_TYPE'))
    }

    if (!Number.isSafeInteger(size)) {
      return _error(callback, errcode(new Error(`Invalid key size '${size}'`), 'ERR_INVALID_KEY_SIZE'))
    }

    const dsname = DsName(name)
    self.store.has(dsname, (err, exists) => {
      if (err) return _error(callback, err)
      if (exists) return _error(callback, errcode(new Error(`Key '${name}' already exists`), 'ERR_KEY_ALREADY_EXISTS'))

      switch (type.toLowerCase()) {
        case 'rsa':
          if (size < 2048) {
            return _error(callback, errcode(new Error(`Invalid RSA key size ${size}`), 'ERR_INVALID_KEY_SIZE'))
          }
          break
        default:
          break
      }

      crypto.keys.generateKeyPair(type, size, (err, keypair) => {
        if (err) return _error(callback, err)
        keypair.id((err, kid) => {
          if (err) return _error(callback, err)
          keypair.export(this._(), (err, pem) => {
            if (err) return _error(callback, err)
            const keyInfo = {
              name: name,
              id: kid
            }
            const batch = self.store.batch()
            batch.put(dsname, pem)
            batch.put(DsInfoName(name), JSON.stringify(keyInfo))
            batch.commit((err) => {
              if (err) return _error(callback, err)

              callback(null, keyInfo)
            })
          })
        })
      })
    })
  }

  /**
   * List all the keys.
   *
   * @param {function(Error, KeyInfo[])} callback
   * @returns {undefined}
   */
  listKeys (callback) {
    const self = this
    const query = {
      prefix: infoPrefix
    }
    pull(
      self.store.query(query),
      collect((err, res) => {
        if (err) return _error(callback, err)

        const info = res.map(r => JSON.parse(r.value))
        callback(null, info)
      })
    )
  }

  /**
   * Find a key by it's id.
   *
   * @param {string} id - The universally unique key identifier.
   * @param {function(Error, KeyInfo)} callback
   * @returns {undefined}
   */
  findKeyById (id, callback) {
    this.listKeys((err, keys) => {
      if (err) return _error(callback, err)

      const key = keys.find((k) => k.id === id)
      callback(null, key)
    })
  }

  /**
   * Find a key by it's name.
   *
   * @param {string} name - The local key name.
   * @param {function(Error, KeyInfo)} callback
   * @returns {undefined}
   */
  findKeyByName (name, callback) {
    if (!validateKeyName(name)) {
      return _error(callback, errcode(new Error(`Invalid key name '${name}'`), 'ERR_INVALID_KEY_NAME'))
    }

    const dsname = DsInfoName(name)
    this.store.get(dsname, (err, res) => {
      if (err) {
        return _error(callback, errcode(new Error(`Key '${name}' does not exist. ${err.message}`), 'ERR_KEY_NOT_FOUND'))
      }

      callback(null, JSON.parse(res.toString()))
    })
  }

  /**
   * Remove an existing key.
   *
   * @param {string} name - The local key name; must already exist.
   * @param {function(Error, KeyInfo)} callback
   * @returns {undefined}
   */
  removeKey (name, callback) {
    const self = this
    if (!validateKeyName(name) || name === 'self') {
      return _error(callback, errcode(new Error(`Invalid key name '${name}'`), 'ERR_INVALID_KEY_NAME'))
    }
    const dsname = DsName(name)
    self.findKeyByName(name, (err, keyinfo) => {
      if (err) return _error(callback, err)
      const batch = self.store.batch()
      batch.delete(dsname)
      batch.delete(DsInfoName(name))
      batch.commit((err) => {
        if (err) return _error(callback, err)
        callback(null, keyinfo)
      })
    })
  }

  /**
   * Rename a key
   *
   * @param {string} oldName - The old local key name; must already exist.
   * @param {string} newName - The new local key name; must not already exist.
   * @param {function(Error, KeyInfo)} callback
   * @returns {undefined}
   */
  renameKey (oldName, newName, callback) {
    const self = this
    if (!validateKeyName(oldName) || oldName === 'self') {
      return _error(callback, errcode(new Error(`Invalid old key name '${oldName}'`), 'ERR_OLD_KEY_NAME_INVALID'))
    }
    if (!validateKeyName(newName) || newName === 'self') {
      return _error(callback, errcode(new Error(`Invalid new key name '${newName}'`), 'ERR_NEW_KEY_NAME_INVALID'))
    }
    const oldDsname = DsName(oldName)
    const newDsname = DsName(newName)
    const oldInfoName = DsInfoName(oldName)
    const newInfoName = DsInfoName(newName)
    this.store.get(oldDsname, (err, res) => {
      if (err) {
        return _error(callback, errcode(new Error(`Key '${oldName}' does not exist. ${err.message}`), 'ERR_KEY_NOT_FOUND'))
      }
      const pem = res.toString()
      self.store.has(newDsname, (err, exists) => {
        if (err) return _error(callback, err)
        if (exists) return _error(callback, errcode(new Error(`Key '${newName}' already exists`), 'ERR_KEY_ALREADY_EXISTS'))

        self.store.get(oldInfoName, (err, res) => {
          if (err) return _error(callback, err)

          const keyInfo = JSON.parse(res.toString())
          keyInfo.name = newName
          const batch = self.store.batch()
          batch.put(newDsname, pem)
          batch.put(newInfoName, JSON.stringify(keyInfo))
          batch.delete(oldDsname)
          batch.delete(oldInfoName)
          batch.commit((err) => {
            if (err) return _error(callback, err)
            callback(null, keyInfo)
          })
        })
      })
    })
  }

  /**
   * Export an existing key as a PEM encrypted PKCS #8 string
   *
   * @param {string} name - The local key name; must already exist.
   * @param {string} password - The password
   * @param {function(Error, string)} callback
   * @returns {undefined}
   */
  exportKey (name, password, callback) {
    if (!validateKeyName(name)) {
      return _error(callback, errcode(new Error(`Invalid key name '${name}'`), 'ERR_INVALID_KEY_NAME'))
    }
    if (!password) {
      return _error(callback, errcode(new Error('Password is required'), 'ERR_PASSWORD_REQUIRED'))
    }

    const dsname = DsName(name)
    this.store.get(dsname, (err, res) => {
      if (err) {
        return _error(callback, errcode(new Error(`Key '${name}' does not exist. ${err.message}`), 'ERR_KEY_NOT_FOUND'))
      }
      const pem = res.toString()
      crypto.keys.import(pem, this._(), (err, privateKey) => {
        if (err) return _error(callback, err)
        privateKey.export(password, callback)
      })
    })
  }

  /**
   * Import a new key from a PEM encoded PKCS #8 string
   *
   * @param {string} name - The local key name; must not already exist.
   * @param {string} pem - The PEM encoded PKCS #8 string
   * @param {string} password - The password.
   * @param {function(Error, KeyInfo)} callback
   * @returns {undefined}
   */
  importKey (name, pem, password, callback) {
    const self = this
    if (!validateKeyName(name) || name === 'self') {
      return _error(callback, errcode(new Error(`Invalid key name '${name}'`), 'ERR_INVALID_KEY_NAME'))
    }
    if (!pem) {
      return _error(callback, 'PEM encoded key is required')
    }
    const dsname = DsName(name)
    self.store.has(dsname, (err, exists) => {
      if (err) return _error(callback, err)
      if (exists) return _error(callback, errcode(new Error(`Key '${name}' already exists`), 'ERR_KEY_ALREADY_EXISTS'))
      crypto.keys.import(pem, password, (err, privateKey) => {
        if (err) return _error(callback, errcode(new Error('Cannot read the key, most likely the password is wrong'), 'ERR_CANNOT_READ_KEY'))
        privateKey.id((err, kid) => {
          if (err) return _error(callback, err)
          privateKey.export(this._(), (err, pem) => {
            if (err) return _error(callback, err)
            const keyInfo = {
              name: name,
              id: kid
            }
            const batch = self.store.batch()
            batch.put(dsname, pem)
            batch.put(DsInfoName(name), JSON.stringify(keyInfo))
            batch.commit((err) => {
              if (err) return _error(callback, err)

              callback(null, keyInfo)
            })
          })
        })
      })
    })
  }

  importPeer (name, peer, callback) {
    const self = this
    if (!validateKeyName(name)) {
      return _error(callback, errcode(new Error(`Invalid key name '${name}'`), 'ERR_INVALID_KEY_NAME'))
    }
    if (!peer || !peer.privKey) {
      return _error(callback, errcode(new Error('Peer.privKey is required'), 'ERR_MISSING_PRIVATE_KEY'))
    }

    const privateKey = peer.privKey
    const dsname = DsName(name)
    self.store.has(dsname, (err, exists) => {
      if (err) return _error(callback, err)
      if (exists) return _error(callback, errcode(new Error(`Key '${name}' already exists`), 'ERR_KEY_ALREADY_EXISTS'))

      privateKey.id((err, kid) => {
        if (err) return _error(callback, err)
        privateKey.export(this._(), (err, pem) => {
          if (err) return _error(callback, err)
          const keyInfo = {
            name: name,
            id: kid
          }
          const batch = self.store.batch()
          batch.put(dsname, pem)
          batch.put(DsInfoName(name), JSON.stringify(keyInfo))
          batch.commit((err) => {
            if (err) return _error(callback, err)

            callback(null, keyInfo)
          })
        })
      })
    })
  }

  /**
   * Gets the private key as PEM encoded PKCS #8 string.
   *
   * @param {string} name
   * @param {function(Error, string)} callback
   * @returns {undefined}
   * @private
   */
  _getPrivateKey (name, callback) {
    if (!validateKeyName(name)) {
      return _error(callback, errcode(new Error(`Invalid key name '${name}'`), 'ERR_INVALID_KEY_NAME'))
    }
    this.store.get(DsName(name), (err, res) => {
      if (err) {
        return _error(callback, errcode(new Error(`Key '${name}' does not exist. ${err.message}`), 'ERR_KEY_NOT_FOUND'))
      }
      callback(null, res.toString())
    })
  }
}

module.exports = Keychain
