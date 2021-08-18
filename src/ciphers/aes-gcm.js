'use strict'

const crypto = require('crypto')
const { concat: uint8ArrayConcat } = require('uint8arrays/concat')
const { fromString: uint8ArrayFromString } = require('uint8arrays/from-string')

// Based off of code from https://github.com/luke-park/SecureCompatibleEncryptionExamples

/**
 *
 * @param {object} [options]
 * @param {number} [options.algorithmTagLength=16]
 * @param {number} [options.nonceLength=12]
 * @param {number} [options.keyLength=16]
 * @param {string} [options.digest=sha256]
 * @param {number} [options.saltLength=16]
 * @param {number} [options.iterations=32767]
 * @returns {*}
 */
function create ({
  algorithmTagLength = 16,
  nonceLength = 12,
  keyLength = 16,
  digest = 'sha256',
  saltLength = 16,
  iterations = 32767
} = {}) {
  const algorithm = 'aes-128-gcm'
  /**
   *
   * @private
   * @param {Uint8Array} data
   * @param {Uint8Array} key
   * @returns {Promise<Uint8Array>}
   */
  async function encryptWithKey (data, key) { // eslint-disable-line require-await
    const nonce = crypto.randomBytes(nonceLength)

    // Create the cipher instance.
    const cipher = crypto.createCipheriv(algorithm, key, nonce)

    // Encrypt and prepend nonce.
    const ciphertext = uint8ArrayConcat([cipher.update(data), cipher.final()])

    return uint8ArrayConcat([nonce, ciphertext, cipher.getAuthTag()])
  }

  /**
   * Uses the provided password to derive a pbkdf2 key. The key
   * will then be used to encrypt the data.
   *
   * @param {Uint8Array} data - The data to decrypt
   * @param {string|Uint8Array} password - A plain password
   * @returns {Promise<Uint8Array>}
   */
  async function encrypt (data, password) { // eslint-disable-line require-await
    // Generate a 128-bit salt using a CSPRNG.
    const salt = crypto.randomBytes(saltLength)

    if (typeof password === 'string' || password instanceof String) {
      password = uint8ArrayFromString(password)
    }

    // Derive a key using PBKDF2.
    const key = crypto.pbkdf2Sync(password, salt, iterations, keyLength, digest)

    // Encrypt and prepend salt.
    return uint8ArrayConcat([salt, await encryptWithKey(Uint8Array.from(data), key)])
  }

  /**
   * Decrypts the given cipher text with the provided key. The `key` should
   * be a cryptographically safe key and not a plaintext password. To use
   * a plaintext password, use `decrypt`. The options used to create
   * this decryption cipher must be the same as those used to create
   * the encryption cipher.
   *
   * @private
   * @param {Uint8Array} ciphertextAndNonce - The data to decrypt
   * @param {Uint8Array} key
   * @returns {Promise<Uint8Array>}
   */
  async function decryptWithKey (ciphertextAndNonce, key) { // eslint-disable-line require-await
    // Create Uint8Arrays of nonce, ciphertext and tag.
    const nonce = ciphertextAndNonce.slice(0, nonceLength)
    const ciphertext = ciphertextAndNonce.slice(nonceLength, ciphertextAndNonce.length - algorithmTagLength)
    const tag = ciphertextAndNonce.slice(ciphertext.length + nonceLength)

    // Create the cipher instance.
    const cipher = crypto.createDecipheriv(algorithm, key, nonce)

    // Decrypt and return result.
    cipher.setAuthTag(tag)
    return uint8ArrayConcat([cipher.update(ciphertext), cipher.final()])
  }

  /**
   * Uses the provided password to derive a pbkdf2 key. The key
   * will then be used to decrypt the data. The options used to create
   * this decryption cipher must be the same as those used to create
   * the encryption cipher.
   *
   * @param {Uint8Array} data - The data to decrypt
   * @param {string|Uint8Array} password - A plain password
   */
  async function decrypt (data, password) { // eslint-disable-line require-await
    // Create Uint8Arrays of salt and ciphertextAndNonce.
    const salt = data.slice(0, saltLength)
    const ciphertextAndNonce = data.slice(saltLength)

    if (typeof password === 'string' || password instanceof String) {
      password = uint8ArrayFromString(password)
    }

    // Derive the key using PBKDF2.
    const key = crypto.pbkdf2Sync(password, salt, iterations, keyLength, digest)

    // Decrypt and return result.
    return decryptWithKey(ciphertextAndNonce, key)
  }

  return {
    encrypt,
    decrypt
  }
}

module.exports = {
  create
}
