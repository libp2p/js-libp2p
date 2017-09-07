'use strict'

const bsplit = require('buffer-split')

/**
 * Checks a record and ensures it is still valid.
 * It runs the needed validators.
 *
 * @param {Object} validators
 * @param {Record} record
 * @param {function(Error)} callback
 * @returns {undefined}
 */
const verifyRecord = (validators, record, callback) => {
  const key = record.key
  const parts = bsplit(key, Buffer.from('/'))

  if (parts.length < 3) {
    // No validator available
    return callback()
  }

  const validator = validators[parts[1].toString()]

  if (!validator) {
    return callback(new Error('Invalid record keytype'))
  }

  validator.func(key, record.value, callback)
}

/**
 * Check if a given key was signed.
 *
 * @param {Object} validators
 * @param {Buffer} key
 * @returns {boolean}
 */
const isSigned = (validators, key) => {
  const parts = bsplit(key, Buffer.from('/'))

  if (parts.length < 3) {
    // No validator available
    return false
  }

  const validator = validators[parts[1].toString()]

  if (!validator) {
    throw new Error('Invalid record keytype')
  }

  return validator.sign
}

module.exports = {
  verifyRecord: verifyRecord,
  isSigned: isSigned,
  validators: require('./validators')
}
