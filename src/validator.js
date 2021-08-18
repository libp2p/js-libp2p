'use strict'

const errcode = require('err-code')
const { toString: uint8ArrayToString } = require('uint8arrays/to-string')

/**
 * @typedef {import('./record')} Record
 */

/**
 * Checks a record and ensures it is still valid.
 * It runs the needed validators.
 * If verification fails the returned Promise will reject with the error.
 *
 * @param {import('libp2p-interfaces/src/types').DhtValidators} validators
 * @param {Record} record
 */
const verifyRecord = (validators, record) => {
  const key = record.key
  const keyString = uint8ArrayToString(key)
  const parts = keyString.split('/')

  if (parts.length < 3) {
    // No validator available
    return
  }

  const validator = validators[parts[1].toString()]

  if (!validator) {
    const errMsg = 'Invalid record keytype'

    throw errcode(new Error(errMsg), 'ERR_INVALID_RECORD_KEY_TYPE')
  }

  return validator.func(key, record.value)
}

module.exports = {
  verifyRecord: verifyRecord,
  validators: require('./validators')
}
