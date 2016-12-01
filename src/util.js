'use strict'

const crypto = require('libp2p-crypto')
const constants = require('./constants')

exports = module.exports

exports.rnd = (length) => {
  if (!length) {
    length = constants.PING_LENGTH
  }
  return crypto.randomBytes(length)
}
