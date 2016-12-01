'use strict'

const randomBytes = require('random-bytes')
const constants = require('./constants')

exports = module.exports

exports.rnd = (length) => {
  if (!length) {
    length = constants.PING_LENGTH
  }
  return randomBytes.sync(length)
}
