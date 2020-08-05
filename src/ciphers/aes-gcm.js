'use strict'

const crypto = require('crypto')

// Based off of code from https://github.com/luke-park/SecureCompatibleEncryptionExamples

/**
 *
 * @param {object} [options]
 * @param {Number} [options.algorithmTagLength=16]
 * @param {Number} [options.nonceLength=12]
 * @param {Number} [options.keyLength=16]
 * @param {string} [options.digest=sha256]
 * @param {Number} [options.saltLength=16]
 * @param {Number} [options.iterations=32767]
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
   * @param {Buffer} data
   * @param {Buffer} key
   * @returns {Promise<Buffer>}
   */
  async function encryptWithKey (data, key) { // eslint-disable-line require-await
    const nonce = crypto.randomBytes(nonceLength)

    // Create the cipher instance.
    const cipher = crypto.createCipheriv(algorithm, key, nonce)

    // Encrypt and prepend nonce.
    const ciphertext = Buffer.concat([cipher.update(data), cipher.final()])

    return Buffer.concat([nonce, ciphertext, cipher.getAuthTag()])
  }

  /**
   * Uses the provided password to derive a pbkdf2 key. The key
   * will then be used to encrypt the data.
   *
   * @param {Buffer} data The data to decrypt
   * @param {string|Buffer} password A plain password
   * @returns {Promise<Buffer>}
   */
  async function encrypt (data, password) { // eslint-disable-line require-await
    // Generate a 128-bit salt using a CSPRNG.
    const salt = crypto.randomBytes(saltLength)

    // Derive a key using PBKDF2.
    const key = crypto.pbkdf2Sync(Buffer.from(password), salt, iterations, keyLength, digest)

    // Encrypt and prepend salt.
    return Buffer.concat([salt, await encryptWithKey(Buffer.from(data), key)])
  }

  /**
   * Decrypts the given cipher text with the provided key. The `key` should
   * be a cryptographically safe key and not a plaintext password. To use
   * a plaintext password, use `decrypt`. The options used to create
   * this decryption cipher must be the same as those used to create
   * the encryption cipher.
   *
   * @private
   * @param {Buffer} ciphertextAndNonce The data to decrypt
   * @param {Buffer} key
   * @returns {Promise<Buffer>}
   */
  async function decryptWithKey (ciphertextAndNonce, key) { // eslint-disable-line require-await
    // Create buffers of nonce, ciphertext and tag.
    const nonce = ciphertextAndNonce.slice(0, nonceLength)
    const ciphertext = ciphertextAndNonce.slice(nonceLength, ciphertextAndNonce.length - algorithmTagLength)
    const tag = ciphertextAndNonce.slice(ciphertext.length + nonceLength)

    // Create the cipher instance.
    const cipher = crypto.createDecipheriv(algorithm, key, nonce)

    // Decrypt and return result.
    cipher.setAuthTag(tag)
    return Buffer.concat([cipher.update(ciphertext), cipher.final()])
  }

  /**
   * Uses the provided password to derive a pbkdf2 key. The key
   * will then be used to decrypt the data. The options used to create
   * this decryption cipher must be the same as those used to create
   * the encryption cipher.
   *
   * @param {Buffer} data The data to decrypt
   * @param {string|Buffer} password A plain password
   */
  async function decrypt (data, password) { // eslint-disable-line require-await
    // Create buffers of salt and ciphertextAndNonce.
    const salt = data.slice(0, saltLength)
    const ciphertextAndNonce = data.slice(saltLength)

    // Derive the key using PBKDF2.
    const key = crypto.pbkdf2Sync(Buffer.from(password), salt, iterations, keyLength, digest)

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
