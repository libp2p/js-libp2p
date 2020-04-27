'use strict'

const errcode = require('err-code')
/**
 * Select the best record out of the given records.
 *
 * @param {Object} selectors
 * @param {Buffer} k
 * @param {Array<Buffer>} records
 * @returns {number} - The index of the best record.
 */
const bestRecord = (selectors, k, records) => {
  if (records.length === 0) {
    const errMsg = 'No records given'

    throw errcode(new Error(errMsg), 'ERR_NO_RECORDS_RECEIVED')
  }

  const parts = k.toString().split('/')

  if (parts.length < 3) {
    const errMsg = 'Record key does not have a selector function'

    throw errcode(new Error(errMsg), 'ERR_NO_SELECTOR_FUNCTION_FOR_RECORD_KEY')
  }

  const selector = selectors[parts[1].toString()]

  if (!selector) {
    const errMsg = `Unrecognized key prefix: ${parts[1]}`

    throw errcode(new Error(errMsg), 'ERR_UNRECOGNIZED_KEY_PREFIX')
  }

  return selector(k, records)
}

module.exports = {
  bestRecord: bestRecord,
  selectors: require('./selectors')
}
