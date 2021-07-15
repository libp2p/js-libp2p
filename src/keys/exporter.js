'use strict'

const { base64 } = require('multiformats/bases/base64')
const ciphers = require('../ciphers/aes-gcm')

module.exports = {
  /**
   * Exports the given PrivateKey as a base64 encoded string.
   * The PrivateKey is encrypted via a password derived PBKDF2 key
   * leveraging the aes-gcm cipher algorithm.
   *
   * @param {Uint8Array} privateKey - The PrivateKey protobuf
   * @param {string} password
   * @returns {Promise<string>} A base64 encoded string
   */
  export: async function (privateKey, password) {
    const cipher = ciphers.create()
    const encryptedKey = await cipher.encrypt(privateKey, password)
    return base64.encode(encryptedKey)
  }
}
