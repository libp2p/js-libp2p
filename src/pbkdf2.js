'use strict'

const crypto = require('jsrsasign').CryptoJS

/**
 * Maps an IPFS hash name to its jsrsasign equivalent.
 *
 * See https://github.com/multiformats/multihash/blob/master/hashtable.csv
 *
 * @private
 */
const hashName = {
  sha1: crypto.algo.SHA1,
  'sha2-256': crypto.algo.SHA256,
  'sha2-512': crypto.algo.SHA512
}

/**
 * Computes the Password-Based Key Derivation Function 2.
 *
 * @param {string} password
 * @param {string} salt
 * @param {number} iterations
 * @param {number} keySize (in bytes)
 * @param {string} hash - The hash name ('sha1', 'sha2-512, ...)
 * @returns {string} - A new password
 */
function pbkdf2 (password, salt, iterations, keySize, hash) {
  const opts = {
    iterations: iterations,
    keySize: keySize / 4, // convert bytes to words (32 bits)
    hasher: hashName[hash]
  }
  if (!opts.hasher) {
    throw new Error(`Hash '${hash}' is unknown or not supported`)
  }
  const words = crypto.PBKDF2(password, salt, opts)
  return crypto.enc.Base64.stringify(words)
}

module.exports = pbkdf2
