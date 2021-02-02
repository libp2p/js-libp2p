'use strict'

/**
 * Best record selector, for public key records.
 * Simply returns the first record, as all valid public key
 * records are equal.
 *
 * @param {Uint8Array} k
 * @param {Array<Uint8Array>} records
 */
const publicKeySelector = (k, records) => {
  return 0
}

module.exports = publicKeySelector
