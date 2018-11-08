'use strict'

const bsplit = require('buffer-split')
const errcode = require('err-code')

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
    const errMsg = `Invalid record keytype`

    return callback(errcode(new Error(errMsg), 'ERR_INVALID_RECORD_KEY_TYPE'))
  }

  validator.func(key, record.value, callback)
}

module.exports = {
  verifyRecord: verifyRecord,
  validators: require('./validators')
}
