'use strict'

const { base64 } = require('multiformats/bases/base64')
const ciphers = require('../ciphers/aes-gcm')

module.exports = {
  /**
   * Attempts to decrypt a base64 encoded PrivateKey string
   * with the given password. The privateKey must have been exported
   * using the same password and underlying cipher (aes-gcm)
   *
   * @param {string} privateKey - A base64 encoded encrypted key
   * @param {string} password
   * @returns {Promise<Uint8Array>} The private key protobuf
   */
  import: async function (privateKey, password) {
    const encryptedKey = base64.decode(privateKey)
    const cipher = ciphers.create()
    return await cipher.decrypt(encryptedKey, password)
  }
}
