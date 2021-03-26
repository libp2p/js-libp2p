'use strict'

const crypto = require('libp2p-crypto')
const constants = require('./constants')

/**
 * @param {number} length
 */
function rnd (length) {
  if (!length) {
    length = constants.PING_LENGTH
  }
  return crypto.randomBytes(length)
}

module.exports = {
  rnd
}
