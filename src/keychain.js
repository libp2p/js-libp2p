'use strict'

const async = require('async')
const sanitize = require('sanitize-filename')
const forge = require('node-forge')
const deepmerge = require('deepmerge')
const crypto = require('libp2p-crypto')
const util = require('./util')
const CMS = require('./cms')
const DS = require('interface-datastore')
const pull = require('pull-stream')

const keyExtension = '.p8'

// NIST SP 800-132
const NIST = {
  minKeyLength: 112 / 8,
  minSaltLength: 128 / 8,
  minIterationCount: 1000
}

/**
 * Maps an IPFS hash name to its forge equivalent.
 *
 * See https://github.com/multiformats/multihash/blob/master/hashtable.csv
 *
 * @private
 */
const hashName2Forge = {
  'sha1': 'sha1',
  'sha2-256': 'sha256',
  'sha2-512': 'sha512',
  
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
  if (typeof err === 'string') err = new Error(err)
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
  return new DS.Key('/' + name)
}

/**
 * Converts a datastore name into a key name.
 *
 * @param {DS.Key} name - A datastore name
 * @returns {string}
 * @private
 */
function KsName (name) {
  return name.toString().slice(1)
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
 * Key management
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
    if (this.store.opts) {
      this.store.opts.extension = keyExtension
    }

    const opts = deepmerge(defaultOptions, options)

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
    this.dek = opts.dek

    // Get the hashing alogorithm
    const hashAlgorithm = hashName2Forge[opts.dek.hash]
    if (!hashAlgorithm)
      throw new Error(`dek.hash '${opts.dek.hash}' is unknown or not supported`)

    // Create the derived encrypting key
    let dek = forge.pkcs5.pbkdf2(
      opts.passPhrase,
      opts.dek.salt,
      opts.dek.iterationCount,
      opts.dek.keyLength,
      hashAlgorithm)
    dek = forge.util.bytesToHex(dek)
    Object.defineProperty(this, '_', { value: () => dek })

    // JS magick
    this._getKeyInfo = this.findKeyByName = this._getKeyInfo.bind(this)

    // Provide access to protected messages
    this.cms = new CMS(this)
  }

  /**
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
      return _error(callback, `Invalid key name '${name}'`)
    }
    const dsname = DsName(name)
    self.store.has(dsname, (err, exists) => {
      if (err) return _error(callback, err)
      if (exists) return _error(callback, `Key '${name}' already exists`)

      switch (type.toLowerCase()) {
        case 'rsa':
          if (size < 2048) {
            return _error(callback, `Invalid RSA key size ${size}`)
          }
          forge.pki.rsa.generateKeyPair({bits: size, workers: -1}, (err, keypair) => {
            if (err) return _error(callback, err)

            const pem = forge.pki.encryptRsaPrivateKey(keypair.privateKey, this._())
            return self.store.put(dsname, pem, (err) => {
              if (err) return _error(callback, err)

              self._getKeyInfo(name, callback)
            })
          })
          break

        default:
          return _error(callback, `Invalid key type '${type}'`)
      }
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
      keysOnly: true
    }
    pull(
      self.store.query(query),
      pull.collect((err, res) => {
        if (err) return _error(callback, err)

        const names = res.map(r => KsName(r.key))
        async.map(names, self._getKeyInfo, callback)
      })
    )
  }

  /**
   * Find a key by it's name.
   *
   * @param {string} id - The universally unique key identifier.
   * @param {function(Error, KeyInfo)} callback
   * @returns {undefined}
   */
  findKeyById (id, callback) {
    // TODO: not very efficent.
    this.listKeys((err, keys) => {
      if (err) return _error(callback, err)

      const key = keys.find((k) => k.id === id)
      callback(null, key)
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
      return _error(callback, `Invalid key name '${name}'`)
    }
    const dsname = DsName(name)
    self._getKeyInfo(name, (err, keyinfo) => {
      if (err) return _error(callback, err)
      self.store.delete(dsname, (err) => {
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
      return _error(callback, `Invalid old key name '${oldName}'`)
    }
    if (!validateKeyName(newName) || newName === 'self') {
      return _error(callback, `Invalid new key name '${newName}'`)
    }
    const oldDsname = DsName(oldName)
    const newDsname = DsName(newName)
    this.store.get(oldDsname, (err, res) => {
      if (err) {
        return _error(callback, `Key '${oldName}' does not exist. ${err.message}`)
      }
      const pem = res.toString()
      self.store.has(newDsname, (err, exists) => {
        if (err) return _error(callback, err)
        if (exists) return _error(callback, `Key '${newName}' already exists`)

        const batch = self.store.batch()
        batch.put(newDsname, pem)
        batch.delete(oldDsname)
        batch.commit((err) => {
          if (err) return _error(callback, err)
          self._getKeyInfo(newName, callback)
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
      return _error(callback, `Invalid key name '${name}'`)
    }
    if (!password) {
      return _error(callback, 'Password is required')
    }

    const dsname = DsName(name)
    this.store.get(dsname, (err, res) => {
      if (err) {
        return _error(callback, `Key '${name}' does not exist. ${err.message}`)
      }
      const pem = res.toString()
      try {
        const options = {
          algorithm: 'aes256',
          count: this.dek.iterationCount,
          saltSize: NIST.minSaltLength,
          prfAlgorithm: 'sha512'
        }
        const privateKey = forge.pki.decryptRsaPrivateKey(pem, this._())
        const res = forge.pki.encryptRsaPrivateKey(privateKey, password, options)
        return callback(null, res)
      } catch (e) {
        _error(callback, e)
      }
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
      return _error(callback, `Invalid key name '${name}'`)
    }
    if (!pem) {
      return _error(callback, 'PEM encoded key is required')
    }
    const dsname = DsName(name)
    self.store.has(dsname, (err, exists) => {
      if (err) return _error(callback, err)
      if (exists) return _error(callback, `Key '${name}' already exists`)
      try {
        const privateKey = forge.pki.decryptRsaPrivateKey(pem, password)
        if (privateKey === null) {
          return _error(callback, 'Cannot read the key, most likely the password is wrong')
        }
        const newpem = forge.pki.encryptRsaPrivateKey(privateKey, this._())
        return self.store.put(dsname, newpem, (err) => {
          if (err) return _error(callback, err)

          this._getKeyInfo(name, callback)
        })
      } catch (err) {
        _error(callback, err)
      }
    })
  }

  importPeer (name, peer, callback) {
    const self = this
    if (!validateKeyName(name)) {
      return _error(callback, `Invalid key name '${name}'`)
    }
    if (!peer || !peer.privKey) {
      return _error(callback, 'Peer.privKey is required')
    }
    const dsname = DsName(name)
    self.store.has(dsname, (err, exists) => {
      if (err) return _error(callback, err)
      if (exists) return _error(callback, `Key '${name}' already exists`)

      const privateKeyProtobuf = peer.marshalPrivKey()
      crypto.keys.unmarshalPrivateKey(privateKeyProtobuf, (err, key) => {
        if (err) return _error(callback, err)
        try {
          const der = key.marshal()
          const buf = forge.util.createBuffer(der.toString('binary'))
          const obj = forge.asn1.fromDer(buf)
          const privateKey = forge.pki.privateKeyFromAsn1(obj)
          if (privateKey === null) {
            return _error(callback, 'Cannot read the peer private key')
          }
          const pem = forge.pki.encryptRsaPrivateKey(privateKey, this._())
          return self.store.put(dsname, pem, (err) => {
            if (err) return _error(callback, err)

            this._getKeyInfo(name, callback)
          })
        } catch (err) {
          _error(callback, err)
        }
      })
    })
  }

  /**
   * Gets the private key as PEM encoded PKCS #8 string.
   *
   * @param {string} name
   * @param {function(Error, string)} callback
   * @returns {undefined}
   */
  _getPrivateKey (name, callback) {
    if (!validateKeyName(name)) {
      return _error(callback, `Invalid key name '${name}'`)
    }
    this.store.get(DsName(name), (err, res) => {
      if (err) {
        return _error(callback, `Key '${name}' does not exist. ${err.message}`)
      }
      callback(null, res.toString())
    })
  }

  _getKeyInfo (name, callback) {
    if (!validateKeyName(name)) {
      return _error(callback, `Invalid key name '${name}'`)
    }

    const dsname = DsName(name)
    this.store.get(dsname, (err, res) => {
      if (err) {
        return _error(callback, `Key '${name}' does not exist. ${err.message}`)
      }
      const pem = res.toString()
      try {
        const privateKey = forge.pki.decryptRsaPrivateKey(pem, this._())
        util.keyId(privateKey, (err, kid) => {
          if (err) return _error(callback, err)

          const info = {
            name: name,
            id: kid
          }
          return callback(null, info)
        })
      } catch (e) {
        _error(callback, e)
      }
    })
  }
}

module.exports = Keychain
