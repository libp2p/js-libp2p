'use strict'

/**
 * Best record selector, for public key records.
 * Simply returns the first record, as all valid public key
 * records are equal.
 *
 * @param {Buffer} k
 * @param {Array<Buffer>} records
 * @returns {number}
 */
const publicKeySelector = (k, records) => {
  return 0
}

module.exports = publicKeySelector
