'use strict'

const concat = require('uint8arrays/concat')
const fromString = require('uint8arrays/from-string')

const webcrypto = require('../webcrypto')

// Based off of code from https://github.com/luke-park/SecureCompatibleEncryptionExamples

/**
 *
 * @param {object} [options]
 * @param {string} [options.algorithm=AES-GCM]
 * @param {number} [options.nonceLength=12]
 * @param {number} [options.keyLength=16]
 * @param {string} [options.digest=sha256]
 * @param {number} [options.saltLength=16]
 * @param {number} [options.iterations=32767]
 * @returns {*}
 */
function create ({
  algorithm = 'AES-GCM',
  nonceLength = 12,
  keyLength = 16,
  digest = 'SHA-256',
  saltLength = 16,
  iterations = 32767
} = {}) {
  const crypto = webcrypto.get()
  keyLength *= 8 // Browser crypto uses bits instead of bytes

  /**
   * Uses the provided password to derive a pbkdf2 key. The key
   * will then be used to encrypt the data.
   *
   * @param {Uint8Array} data - The data to decrypt
   * @param {string} password - A plain password
   * @returns {Promise<Uint8Array>}
   */
  async function encrypt (data, password) { // eslint-disable-line require-await
    const salt = crypto.getRandomValues(new Uint8Array(saltLength))
    const nonce = crypto.getRandomValues(new Uint8Array(nonceLength))
    const aesGcm = { name: algorithm, iv: nonce }

    // Derive a key using PBKDF2.
    const deriveParams = { name: 'PBKDF2', salt, iterations, hash: { name: digest } }
    const rawKey = await crypto.subtle.importKey('raw', fromString(password), { name: 'PBKDF2' }, false, ['deriveKey', 'deriveBits'])
    const cryptoKey = await crypto.subtle.deriveKey(deriveParams, rawKey, { name: algorithm, length: keyLength }, true, ['encrypt'])

    // Encrypt the string.
    const ciphertext = await crypto.subtle.encrypt(aesGcm, cryptoKey, data)
    return concat([salt, aesGcm.iv, new Uint8Array(ciphertext)])
  }

  /**
   * Uses the provided password to derive a pbkdf2 key. The key
   * will then be used to decrypt the data. The options used to create
   * this decryption cipher must be the same as those used to create
   * the encryption cipher.
   *
   * @param {Uint8Array} data - The data to decrypt
   * @param {string} password - A plain password
   * @returns {Promise<Uint8Array>}
   */
  async function decrypt (data, password) {
    const salt = data.slice(0, saltLength)
    const nonce = data.slice(saltLength, saltLength + nonceLength)
    const ciphertext = data.slice(saltLength + nonceLength)
    const aesGcm = { name: algorithm, iv: nonce }

    // Derive the key using PBKDF2.
    const deriveParams = { name: 'PBKDF2', salt, iterations, hash: { name: digest } }
    const rawKey = await crypto.subtle.importKey('raw', fromString(password), { name: 'PBKDF2' }, false, ['deriveKey', 'deriveBits'])
    const cryptoKey = await crypto.subtle.deriveKey(deriveParams, rawKey, { name: algorithm, length: keyLength }, true, ['decrypt'])

    // Decrypt the string.
    const plaintext = await crypto.subtle.decrypt(aesGcm, cryptoKey, ciphertext)
    return new Uint8Array(plaintext)
  }

  return {
    encrypt,
    decrypt
  }
}

module.exports = {
  create
}
